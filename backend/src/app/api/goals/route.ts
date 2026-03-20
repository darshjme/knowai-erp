import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

// Roles that can create company-level goals
const COMPANY_GOAL_ROLES = ["CEO", "CTO", "ADMIN", "PRODUCT_OWNER"];

// Roles at SR_DEVELOPER level and above that can create team goals
const TEAM_GOAL_ROLES = [
  "CEO", "CTO", "CFO", "ADMIN", "HR",
  "PRODUCT_OWNER", "BRAND_FACE", "BRAND_PARTNER",
  "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST", "SR_DEVELOPER",
];

// ── GET: List goals with filters ──────────────────────────────────────────

export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const ownerId = searchParams.get("ownerId");
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const scope = searchParams.get("scope"); // COMPANY, TEAM, PERSONAL
  const category = searchParams.get("category"); // PROFESSIONAL, PERSONAL, HEALTH, WEALTH
  const parentId = searchParams.get("parentId");
  const topLevel = searchParams.get("topLevel"); // "true" = only objectives with no parent
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {
    workspaceId: user.workspaceId,
  };

  if (ownerId) where.ownerId = ownerId;
  if (status && status !== "ALL") where.status = status;
  if (type && type !== "ALL") where.type = type;
  if (scope && scope !== "ALL") where.scope = scope;
  if (category && category !== "ALL") where.category = category;
  if (parentId) where.parentId = parentId;
  if (topLevel === "true") where.parentId = null;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Visibility: ADMIN/CEO/CTO see all goals.
  // Others see: company goals (visible to all) + team goals where they are
  // the owner or in the same department + their personal goals.
  const isFullAccess = ["CEO", "CTO", "ADMIN"].includes(user.role);
  if (!isFullAccess && !ownerId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (where as any).OR = [
      { scope: "COMPANY" },
      { scope: "TEAM", ownerId: user.id },
      ...(user.department
        ? [{ scope: "TEAM", owner: { department: user.department } }]
        : []),
      { scope: "PERSONAL", ownerId: user.id },
      // Legacy goals without scope are visible to all
      { scope: null },
    ];
  }

  const goals = await prisma.goal.findMany({
    where,
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
      },
      children: {
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
          },
          children: {
            include: {
              owner: {
                select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get summary stats
  const allGoals = await prisma.goal.findMany({
    where: { workspaceId: user.workspaceId },
    select: { status: true },
  });

  const stats = {
    total: allGoals.length,
    onTrack: allGoals.filter((g) => g.status === "ON_TRACK").length,
    atRisk: allGoals.filter((g) => g.status === "AT_RISK").length,
    behind: allGoals.filter((g) => g.status === "BEHIND").length,
    completed: allGoals.filter((g) => g.status === "COMPLETED").length,
  };

  return jsonOk({
    success: true,
    data: goals,
    stats,
    currentUserId: user.id,
    currentUserRole: user.role,
  });
});

// ── POST: Create goal ─────────────────────────────────────────────────────
// CEO/CTO/ADMIN/PRODUCT_OWNER can create company goals.
// SR_DEVELOPER and above can create team goals.
// All roles can create personal goals.

export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const body = await req.json();
  const {
    title, description, type, parentId, ownerId,
    startDate, endDate, metricType, metricTarget, scope, category,
  } = body;

  if (!title) return jsonError("Title is required", 400);

  // Determine the goal scope (default to PERSONAL if not specified)
  const goalScope = scope || "PERSONAL";

  // Validate scope permissions
  if (goalScope === "COMPANY" && !COMPANY_GOAL_ROLES.includes(user.role)) {
    return jsonError("You do not have permission to create company goals", 403);
  }
  if (goalScope === "TEAM" && !TEAM_GOAL_ROLES.includes(user.role)) {
    return jsonError("You do not have permission to create team goals", 403);
  }

  // If parentId is provided, verify it belongs to same workspace
  if (parentId) {
    const parent = await prisma.goal.findFirst({
      where: { id: parentId, workspaceId: user.workspaceId },
    });
    if (!parent) return jsonError("Parent goal not found", 404);
  }

  const goal = await prisma.goal.create({
    data: {
      title,
      description: description || null,
      type: type || "OBJECTIVE",
      scope: goalScope,
      category: category || "PROFESSIONAL",
      parentId: parentId || null,
      ownerId: ownerId || user.id,
      workspaceId: user.workspaceId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      metricType: metricType || null,
      metricTarget: metricTarget ? parseFloat(metricTarget) : null,
    },
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
      },
      children: true,
    },
  });

  return jsonOk({ success: true, data: goal }, 201);
});

// ── PATCH: Update goal ────────────────────────────────────────────────────

export const PATCH = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const body = await req.json();
  const {
    id, title, description, type, status, progress,
    metricCurrent, metricTarget, metricType,
    startDate, endDate, ownerId, scope,
  } = body;

  if (!id) return jsonError("Goal id is required", 400);

  const existing = await prisma.goal.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (!existing) return jsonError("Goal not found", 404);

  // Permission: ADMIN/CEO/CTO can update any goal.
  // PRODUCT_OWNER can update company/team goals.
  // SR_DEVELOPER+ can update team goals they own.
  // Everyone can update their own personal goals.
  const isFullAccess = ["CEO", "CTO", "ADMIN"].includes(user.role);
  const isOwner = existing.ownerId === user.id;

  if (!isFullAccess && !isOwner) {
    // PRODUCT_OWNER can edit company/team goals
    if (user.role === "PRODUCT_OWNER" && (existing.scope === "COMPANY" || existing.scope === "TEAM")) {
      // allowed
    } else {
      return jsonError("You can only update your own goals", 403);
    }
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (type !== undefined) updateData.type = type;
  if (status !== undefined) updateData.status = status;
  if (scope !== undefined) updateData.scope = scope;
  if (progress !== undefined) {
    const numProgress = typeof progress === "number" ? progress : parseInt(String(progress), 10);
    updateData.progress = Number.isNaN(numProgress) ? 0 : Math.min(100, Math.max(0, numProgress));
  }
  if (metricCurrent !== undefined) {
    const val = typeof metricCurrent === "number" ? metricCurrent : parseFloat(String(metricCurrent));
    updateData.metricCurrent = Number.isNaN(val) ? null : val;
  }
  if (metricTarget !== undefined) {
    const val = typeof metricTarget === "number" ? metricTarget : parseFloat(String(metricTarget));
    updateData.metricTarget = Number.isNaN(val) ? null : val;
  }
  if (metricType !== undefined) updateData.metricType = metricType;
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
  if (ownerId !== undefined) updateData.ownerId = ownerId;

  // Auto-set status to COMPLETED if progress hits 100
  if (progress !== undefined) {
    const numP = typeof progress === "number" ? progress : parseInt(String(progress), 10);
    if (!Number.isNaN(numP) && numP >= 100) {
      updateData.status = "COMPLETED";
    }
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: updateData,
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
      },
      children: {
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
          },
        },
      },
    },
  });

  // Auto-update parent progress based on children average
  if (existing.parentId) {
    const siblings = await prisma.goal.findMany({
      where: { parentId: existing.parentId },
      select: { progress: true },
    });
    const avgProgress = Math.round(
      siblings.reduce((sum, s) => sum + s.progress, 0) / siblings.length
    );
    await prisma.goal.update({
      where: { id: existing.parentId },
      data: { progress: avgProgress },
    });
  }

  return jsonOk({ success: true, data: goal });
});

// ── DELETE: Delete goal ───────────────────────────────────────────────────

export const DELETE = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return jsonError("Goal id is required", 400);

  const existing = await prisma.goal.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: { children: true },
  });
  if (!existing) return jsonError("Goal not found", 404);

  // Permission: ADMIN/CEO/CTO can delete any. Others only their own.
  const isFullAccess = ["CEO", "CTO", "ADMIN"].includes(user.role);
  const isOwner = existing.ownerId === user.id;

  if (!isFullAccess && !isOwner) {
    return jsonError("You can only delete your own goals", 403);
  }

  // Recursively delete all descendants
  async function deleteDescendants(parentId: string) {
    const children = await prisma.goal.findMany({
      where: { parentId },
      select: { id: true },
    });
    for (const child of children) {
      await deleteDescendants(child.id);
    }
    if (children.length > 0) {
      await prisma.goal.deleteMany({
        where: { parentId },
      });
    }
  }
  await deleteDescendants(id);
  await prisma.goal.delete({ where: { id } });
  return jsonOk({ success: true, message: "Goal deleted" });
});
