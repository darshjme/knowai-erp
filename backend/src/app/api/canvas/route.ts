import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthFromHeaders } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const loadId = searchParams.get("loadId");
    const projectId = searchParams.get("projectId");

    // Load a single canvas by ID (includes full data)
    if (loadId) {
      const canvas = await prisma.canvas.findFirst({
        where: { id: loadId, createdById: auth.userId },
      });
      if (!canvas) return jsonError("Canvas not found", 404);
      return jsonOk({ success: true, canvas });
    }

    const where: Record<string, unknown> = {
      createdById: auth.userId,
    };
    if (auth.workspaceId) {
      where.workspaceId = auth.workspaceId;
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const canvases = await prisma.canvas.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return jsonOk({ success: true, data: canvases });
  } catch (error) {
    console.error("Canvas GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { title, data, projectId } = await req.json();

    if (!title) {
      return jsonError("Title is required", 400);
    }

    const canvas = await prisma.canvas.create({
      data: {
        title,
        data: data || "[]",
        projectId: projectId || null,
        createdById: auth.userId,
        workspaceId: auth.workspaceId || "",
      },
    });

    return jsonOk({ success: true, data: canvas }, 201);
  } catch (error) {
    console.error("Canvas POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { id, title, data } = await req.json();

    if (!id) {
      return jsonError("Canvas ID is required", 400);
    }

    // Verify ownership
    const existing = await prisma.canvas.findFirst({
      where: { id, createdById: auth.userId },
    });
    if (!existing) {
      return jsonError("Canvas not found", 404);
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (data !== undefined) updateData.data = data;

    const canvas = await prisma.canvas.update({
      where: { id },
      data: updateData,
    });

    return jsonOk({ success: true, data: canvas });
  } catch (error) {
    console.error("Canvas PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonError("Canvas ID is required", 400);
    }

    // Verify ownership
    const existing = await prisma.canvas.findFirst({
      where: { id, createdById: auth.userId },
    });
    if (!existing) {
      return jsonError("Canvas not found", 404);
    }

    await prisma.canvas.delete({ where: { id } });

    return jsonOk({ success: true, message: "Canvas deleted" });
  } catch (error) {
    console.error("Canvas DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
