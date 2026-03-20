import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const loadId = searchParams.get("loadId");
  const projectId = searchParams.get("projectId");

  // Load a single canvas by ID (includes full data)
  if (loadId) {
    const canvas = await prisma.canvas.findFirst({
      where: { id: loadId, createdById: user.id },
    });
    if (!canvas) return jsonError("Canvas not found", 404);
    return jsonOk({ success: true, canvas });
  }

  const where: Record<string, unknown> = {
    createdById: user.id,
  };
  if (user.workspaceId) {
    where.workspaceId = user.workspaceId;
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
});

export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { title, data, projectId } = await req.json();

  if (!title) {
    return jsonError("Title is required", 400);
  }

  const canvas = await prisma.canvas.create({
    data: {
      title,
      data: data || "[]",
      projectId: projectId || null,
      createdById: user.id,
      workspaceId: user.workspaceId || "",
    },
  });

  return jsonOk({ success: true, data: canvas }, 201);
});

export const PATCH = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { id, title, data } = await req.json();

  if (!id) {
    return jsonError("Canvas ID is required", 400);
  }

  // Verify ownership
  const existing = await prisma.canvas.findFirst({
    where: { id, createdById: user.id },
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
});

export const DELETE = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return jsonError("Canvas ID is required", 400);
  }

  // Verify ownership
  const existing = await prisma.canvas.findFirst({
    where: { id, createdById: user.id },
  });
  if (!existing) {
    return jsonError("Canvas not found", 404);
  }

  await prisma.canvas.delete({ where: { id } });

  return jsonOk({ success: true, message: "Canvas deleted" });
});
