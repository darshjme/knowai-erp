import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const spaces = await prisma.space.findMany({
    where: { workspaceId: user.workspaceId },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          tasks: {
            select: {
              assigneeId: true,
            },
          },
        },
      },
      _count: {
        select: { projects: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Compute member counts (unique users across projects in each space)
  const spacesWithCounts = spaces.map((space) => {
    const memberIds = new Set<string>();
    space.projects.forEach((p) => {
      if (p.manager) memberIds.add(p.manager.id);
      p.tasks.forEach((t) => {
        if (t.assigneeId) memberIds.add(t.assigneeId);
      });
    });
    return {
      ...space,
      memberCount: memberIds.size,
      projectCount: space._count.projects,
    };
  });

  return jsonOk({ success: true, data: spacesWithCounts });
});

export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { name, description, color, icon } = await req.json();
  if (!name) return jsonError("Space name is required", 400);

  const space = await prisma.space.create({
    data: {
      name,
      description: description || null,
      color: color || "#3b82f6",
      icon: icon || null,
      workspaceId: user.workspaceId,
      createdById: user.id,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
        },
      },
      projects: true,
      _count: { select: { projects: true } },
    },
  });

  return jsonOk({ success: true, data: { ...space, memberCount: 0, projectCount: 0 } }, 201);
});

export const PATCH = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { id, name, description, color, icon, projectIds } = await req.json();
  if (!id) return jsonError("Space id is required", 400);

  const existing = await prisma.space.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (!existing) return jsonError("Space not found", 404);

  // If projectIds is provided, update project assignments
  if (projectIds !== undefined) {
    // Remove all projects from this space first
    await prisma.project.updateMany({
      where: { spaceId: id },
      data: { spaceId: null },
    });
    // Assign specified projects to this space
    if (Array.isArray(projectIds) && projectIds.length > 0) {
      await prisma.project.updateMany({
        where: {
          id: { in: projectIds },
          workspaceId: user.workspaceId,
        },
        data: { spaceId: id },
      });
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (color !== undefined) data.color = color;
  if (icon !== undefined) data.icon = icon;

  const space = await prisma.space.update({
    where: { id },
    data,
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, avatar: true },
      },
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          progress: true,
          manager: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          tasks: { select: { assigneeId: true } },
        },
      },
      _count: { select: { projects: true } },
    },
  });

  const memberIds = new Set<string>();
  space.projects.forEach((p) => {
    if (p.manager) memberIds.add(p.manager.id);
    p.tasks.forEach((t) => {
      if (t.assigneeId) memberIds.add(t.assigneeId);
    });
  });

  return jsonOk({
    success: true,
    data: { ...space, memberCount: memberIds.size, projectCount: space._count.projects },
  });
});

export const DELETE = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return jsonError("Space id is required", 400);

  const existing = await prisma.space.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (!existing) return jsonError("Space not found", 404);

  // Unlink projects (don't delete them)
  await prisma.project.updateMany({
    where: { spaceId: id },
    data: { spaceId: null },
  });

  await prisma.space.delete({ where: { id } });
  return jsonOk({ success: true, message: "Space deleted" });
});
