import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// Roles that can create and edit ALL docs (not just their own)
const DOC_EDITOR_ROLES = ["ADMIN", "EDITOR", "CONTENT_STRATEGIST"];

// ─── GET: List docs (tree or flat) ──────────────────────────────
// All roles can read published docs. Unpublished docs visible to
// DOC_EDITOR_ROLES + the doc creator.
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId"); // null = root docs
    const projectId = searchParams.get("projectId");
    const search = searchParams.get("search");
    const all = searchParams.get("all"); // "true" = flat list for search

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { workspaceId: user.workspaceId };

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    } else if (all !== "true") {
      where.parentId = parentId || null;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    // Non-editor roles only see published docs + their own drafts
    if (!DOC_EDITOR_ROLES.includes(user.role)) {
      where.OR = [
        { isPublished: true },
        { createdById: user.id },
      ];
    }

    const docs = await prisma.doc.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        children: { select: { id: true } },
      },
    });

    return jsonOk({ success: true, data: docs });
  } catch (error) {
    console.error("Docs GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── POST: Create doc ───────────────────────────────────────────
// EDITOR/CONTENT_STRATEGIST/ADMIN can create docs freely.
// Others can also create docs (they will own them).
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { title, content, icon, parentId, projectId } = body;

    if (!title || typeof title !== "string") {
      return jsonError("Title is required", 400);
    }

    // Validate parentId belongs to same workspace if provided
    if (parentId) {
      const parentDoc = await prisma.doc.findFirst({
        where: { id: parentId, workspaceId: user.workspaceId },
      });
      if (!parentDoc) return jsonError("Parent document not found", 404);
    }

    const doc = await prisma.doc.create({
      data: {
        title: title.trim(),
        content: content || "",
        icon: icon || null,
        parentId: parentId || null,
        projectId: projectId || null,
        createdById: user.id,
        workspaceId: user.workspaceId,
      },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        children: { select: { id: true } },
      },
    });

    return jsonOk({ success: true, data: doc }, 201);
  } catch (error) {
    console.error("Docs POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── PATCH: Update doc ──────────────────────────────────────────
// EDITOR/CONTENT_STRATEGIST/ADMIN can edit all docs.
// Others can only edit docs they created.
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { id, title, content, icon, parentId, isPublished, projectId } = body;

    if (!id) return jsonError("Document id is required", 400);

    const existing = await prisma.doc.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!existing) return jsonError("Document not found", 404);

    // Permission check: editors can edit all, others only their own
    const isDocEditor = DOC_EDITOR_ROLES.includes(user.role);
    const isCreator = existing.createdById === user.id;

    if (!isDocEditor && !isCreator) {
      return jsonError("You can only edit documents you created", 403);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (icon !== undefined) data.icon = icon;
    if (parentId !== undefined) data.parentId = parentId || null;
    if (isPublished !== undefined) data.isPublished = isPublished;
    if (projectId !== undefined) data.projectId = projectId || null;

    const doc = await prisma.doc.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        children: { select: { id: true } },
      },
    });

    return jsonOk({ success: true, data: doc });
  } catch (error) {
    console.error("Docs PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── DELETE: Delete doc and children ────────────────────────────
// EDITOR/CONTENT_STRATEGIST/ADMIN can delete any doc.
// Others can only delete docs they created.
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const id = body?.id;
    if (!id) return jsonError("Document id is required", 400);

    const existing = await prisma.doc.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!existing) return jsonError("Document not found", 404);

    // Permission check
    const isDocEditor = DOC_EDITOR_ROLES.includes(user.role);
    const isCreator = existing.createdById === user.id;

    if (!isDocEditor && !isCreator) {
      return jsonError("You can only delete documents you created", 403);
    }

    // Recursively delete children (hierarchy support)
    async function deleteDocTree(docId: string) {
      const children = await prisma.doc.findMany({ where: { parentId: docId }, select: { id: true } });
      for (const child of children) {
        await deleteDocTree(child.id);
      }
      await prisma.doc.delete({ where: { id: docId } });
    }

    await deleteDocTree(id);

    return jsonOk({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("Docs DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
