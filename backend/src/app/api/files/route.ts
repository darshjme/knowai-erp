import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";

// Roles with full file management (create folders, rename, delete any file)
const FILE_MANAGER_ROLES = ["ADMIN", "EDITOR", "GRAPHIC_DESIGNER"];

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "files");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const folderIdParam = searchParams.get("folderId");
    const search = searchParams.get("search");
    const projectId = searchParams.get("projectId");
    const fileType = searchParams.get("fileType");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    } else {
      where.folderId = folderIdParam ?? null;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (fileType) {
      where.fileType = { contains: fileType, mode: "insensitive" };
    }

    // ADMIN sees all files. EDITOR/GRAPHIC_DESIGNER see all files.
    // Others see: own uploads + files uploaded by users in their projects.
    if (
      user.role !== "ADMIN" &&
      user.role !== "EDITOR" &&
      user.role !== "GRAPHIC_DESIGNER"
    ) {
      const [assignedTasks, managedProjects] = await Promise.all([
        prisma.task.findMany({
          where: { assigneeId: user.id },
          select: { projectId: true },
          distinct: ["projectId"],
        }),
        prisma.project.findMany({
          where: { managerId: user.id },
          select: { id: true },
        }),
      ]);

      const projectIds = [
        ...new Set([
          ...assignedTasks.map((t) => t.projectId),
          ...managedProjects.map((p) => p.id),
        ]),
      ];

      const [projectManagers, projectAssignees] = await Promise.all([
        prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: { managerId: true },
        }),
        prisma.task.findMany({
          where: { projectId: { in: projectIds }, assigneeId: { not: null } },
          select: { assigneeId: true },
          distinct: ["assigneeId"],
        }),
      ]);

      const teamUserIds = [
        ...new Set([
          user.id,
          ...projectManagers.map((p) => p.managerId),
          ...projectAssignees
            .map((t) => t.assigneeId)
            .filter((id): id is string => id !== null),
        ]),
      ];

      where.uploadedById = { in: teamUserIds };
    }

    const files = await prisma.file.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { children: true },
        },
      },
      orderBy: [{ isFolder: "desc" }, { createdAt: "desc" }],
    });

    return jsonOk({ success: true, data: files });
  } catch (error) {
    console.error("GET /api/files error:", error);
    return jsonError("Failed to fetch files", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const contentType = req.headers.get("content-type") || "";

    // Handle multipart/form-data uploads
    if (contentType.includes("multipart/form-data")) {
      await ensureUploadDir();

      const formData = await req.formData();
      const file = formData.get("file") as globalThis.File | null;
      const isFolder = formData.get("isFolder") === "true";
      const folderName = formData.get("name") as string | null;
      const folderId = formData.get("folderId") as string | null;
      const projectId = formData.get("projectId") as string | null;

      // Create folder
      if (isFolder) {
        if (!FILE_MANAGER_ROLES.includes(user.role)) {
          return jsonError("You do not have permission to create folders", 403);
        }
        if (!folderName || !folderName.trim()) {
          return jsonError("Folder name is required");
        }
        if (folderId) {
          const parentFolder = await prisma.file.findUnique({ where: { id: folderId } });
          if (!parentFolder || !parentFolder.isFolder) {
            return jsonError("Parent folder not found");
          }
        }
        const folder = await prisma.file.create({
          data: {
            name: folderName.trim(),
            isFolder: true,
            folderId: folderId || null,
            projectId: projectId || null,
            uploadedById: user.id,
          },
          include: {
            uploadedBy: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            _count: { select: { children: true } },
          },
        });
        return jsonOk({ success: true, data: folder }, 201);
      }

      // Upload file
      if (!file || typeof file === "string") {
        return jsonError("No file provided");
      }

      if (file.size > MAX_FILE_SIZE) {
        return jsonError("File size exceeds 50MB limit");
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate UUID-prefixed filename
      const uuid = randomUUID();
      const ext = path.extname(file.name);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storedFilename = `${uuid}-${safeName}`;
      const filePath = path.join(UPLOAD_DIR, storedFilename);
      const serveUrl = `/api/files/serve/${storedFilename}`;

      await writeFile(filePath, buffer);

      if (folderId) {
        const parentFolder = await prisma.file.findUnique({ where: { id: folderId } });
        if (!parentFolder || !parentFolder.isFolder) {
          return jsonError("Parent folder not found");
        }
      }

      const dbFile = await prisma.file.create({
        data: {
          name: file.name,
          size: file.size,
          fileType: file.type || null,
          filePath: `uploads/files/${storedFilename}`,
          url: serveUrl,
          folderId: folderId || null,
          projectId: projectId || null,
          uploadedById: user.id,
        },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
          _count: { select: { children: true } },
        },
      });

      return jsonOk({ success: true, data: dbFile }, 201);
    }

    // Handle JSON body (legacy support for folder creation)
    const body = await req.json();
    const { name, isFolder, folderId, size, fileType } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return jsonError("Name is required");
    }

    if (isFolder && !FILE_MANAGER_ROLES.includes(user.role)) {
      return jsonError("You do not have permission to create folders", 403);
    }

    if (folderId) {
      const parentFolder = await prisma.file.findUnique({ where: { id: folderId } });
      if (!parentFolder || !parentFolder.isFolder) {
        return jsonError("Parent folder not found");
      }
    }

    const fileRecord = await prisma.file.create({
      data: {
        name: name.trim(),
        isFolder: isFolder ?? false,
        folderId: folderId ?? null,
        size: size ?? 0,
        fileType: fileType ?? null,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: { select: { children: true } },
      },
    });

    return jsonOk({ success: true, data: fileRecord }, 201);
  } catch (error) {
    console.error("POST /api/files error:", error);
    return jsonError("Failed to create file", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { id, name } = body;

    if (!id) return jsonError("File id is required");
    if (!name || typeof name !== "string" || !name.trim()) {
      return jsonError("Name is required");
    }

    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return jsonError("File not found", 404);

    const isOwner = file.uploadedById === user.id;
    const isPrivileged = FILE_MANAGER_ROLES.includes(user.role);

    if (!isOwner && !isPrivileged) {
      return jsonError("Forbidden", 403);
    }

    const updated = await prisma.file.update({
      where: { id },
      data: { name: name.trim() },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: { select: { children: true } },
      },
    });

    return jsonOk({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/files error:", error);
    return jsonError("Failed to rename file", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return jsonError("File id is required");

    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) return jsonError("File not found", 404);

    const isOwner = file.uploadedById === user.id;
    const isPrivileged = FILE_MANAGER_ROLES.includes(user.role);

    if (!isOwner && !isPrivileged) {
      return jsonError("Forbidden", 403);
    }

    if (file.isFolder) {
      await deleteFolderRecursive(id);
    } else {
      // Delete file from disk
      if (file.filePath) {
        const fullPath = path.join(process.cwd(), file.filePath);
        try {
          await unlink(fullPath);
        } catch {
          // File may not exist on disk, continue with DB deletion
        }
      }
      await prisma.file.delete({ where: { id } });
    }

    return jsonOk({ success: true, message: "File deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/files error:", error);
    return jsonError("Failed to delete file", 500);
  }
}

async function deleteFolderRecursive(folderId: string) {
  const children = await prisma.file.findMany({
    where: { folderId },
  });

  for (const child of children) {
    if (child.isFolder) {
      await deleteFolderRecursive(child.id);
    } else {
      // Delete file from disk
      if (child.filePath) {
        const fullPath = path.join(process.cwd(), child.filePath);
        try {
          await unlink(fullPath);
        } catch {
          // File may not exist on disk
        }
      }
      await prisma.file.delete({ where: { id: child.id } });
    }
  }

  await prisma.file.delete({ where: { id: folderId } });
}
