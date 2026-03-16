import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthFromHeaders } from "@/lib/api-utils";

// Roles that see ALL time entries in the workspace
const FULL_ACCESS_ROLES = ["ADMIN", "CEO"];

// Manager-level roles that can see their team's time entries
// (users who report to them via reportingTo field)
const MANAGER_ROLES = [
  "CTO", "CFO", "HR", "PRODUCT_OWNER", "BRAND_FACE",
  "BRAND_PARTNER", "CONTENT_STRATEGIST", "SR_DEVELOPER",
];

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId");
    const taskId = searchParams.get("taskId");
    const projectId = searchParams.get("projectId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const billable = searchParams.get("billable");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "100", 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};

    if (auth.workspaceId) where.workspaceId = auth.workspaceId;
    if (taskId) where.taskId = taskId;
    if (projectId) where.projectId = projectId;
    if (billable !== null && billable !== undefined && billable !== "") {
      where.billable = billable === "true";
    }

    if (startDate || endDate) {
      where.startTime = {} as Record<string, Date>;
      if (startDate) (where.startTime as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.startTime as Record<string, Date>).lte = new Date(endDate);
    }

    // Visibility logic:
    // ADMIN/CEO: see all time entries
    // Manager roles: see own + direct reports' entries
    // Others: see only own entries
    if (FULL_ACCESS_ROLES.includes(auth.role)) {
      // Full access - apply userId filter only if explicitly requested
      if (requestedUserId) where.userId = requestedUserId;
    } else if (MANAGER_ROLES.includes(auth.role)) {
      if (requestedUserId) {
        // Manager requesting specific user: allow if it's themselves or a direct report
        if (requestedUserId !== auth.userId) {
          const reportee = await prisma.user.findFirst({
            where: { id: requestedUserId, reportingTo: auth.userId },
          });
          if (!reportee) {
            return jsonError("You can only view time entries for yourself or your direct reports", 403);
          }
        }
        where.userId = requestedUserId;
      } else {
        // No userId specified: show own entries + direct reports
        const directReports = await prisma.user.findMany({
          where: { reportingTo: auth.userId },
          select: { id: true },
        });
        const teamUserIds = [auth.userId, ...directReports.map((r) => r.id)];
        where.userId = { in: teamUserIds };
      }
    } else {
      // Regular users: only their own entries
      where.userId = auth.userId;
    }

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          task: { select: { id: true, title: true } },
          project: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { startTime: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return jsonOk({
      success: true,
      data: entries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Time tracking GET error:", error);

    // Fallback mock data if table doesn't exist yet
    if (
      (error as Error).message?.includes("does not exist") ||
      (error as Error).message?.includes("no such table")
    ) {
      return getMockTimeEntries();
    }

    return jsonError("Internal server error", 500);
  }
}

// All roles can track their own time
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { taskId, projectId, description, startTime, endTime, duration, billable } = body;

    if (!startTime) return jsonError("startTime is required", 400);

    const entry = await prisma.timeEntry.create({
      data: {
        userId: auth.userId,
        taskId: taskId || null,
        projectId: projectId || null,
        description: description || null,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration: duration ?? null,
        billable: billable !== undefined ? billable : true,
        workspaceId: auth.workspaceId || "",
      },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    return jsonOk({ success: true, data: entry }, 201);
  } catch (error) {
    console.error("Time tracking POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// Users can update their own entries. ADMIN/CEO can update any entry.
export async function PATCH(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { id, endTime, duration, description, billable, taskId, projectId } = body;

    if (!id) return jsonError("id is required", 400);

    // ADMIN/CEO can edit any entry; others only their own
    const isFullAccess = FULL_ACCESS_ROLES.includes(auth.role);

    const existing = isFullAccess
      ? await prisma.timeEntry.findFirst({ where: { id } })
      : await prisma.timeEntry.findFirst({ where: { id, userId: auth.userId } });

    if (!existing) return jsonError("Time entry not found", 404);

    const updateData: Record<string, unknown> = {};
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
    if (duration !== undefined) updateData.duration = duration;
    if (description !== undefined) updateData.description = description;
    if (billable !== undefined) updateData.billable = billable;
    if (taskId !== undefined) updateData.taskId = taskId || null;
    if (projectId !== undefined) updateData.projectId = projectId || null;

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    return jsonOk({ success: true, data: entry });
  } catch (error) {
    console.error("Time tracking PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

// Users can delete their own entries. ADMIN/CEO can delete any entry.
export async function DELETE(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return jsonError("id is required", 400);

    const isFullAccess = FULL_ACCESS_ROLES.includes(auth.role);

    const existing = isFullAccess
      ? await prisma.timeEntry.findFirst({ where: { id } })
      : await prisma.timeEntry.findFirst({ where: { id, userId: auth.userId } });

    if (!existing) return jsonError("Time entry not found", 404);

    await prisma.timeEntry.delete({ where: { id } });

    return jsonOk({ success: true, message: "Time entry deleted" });
  } catch (error) {
    console.error("Time tracking DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}

function getMockTimeEntries() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mockEntries = [
    {
      id: "te-1",
      userId: "mock-user",
      taskId: "task-1",
      projectId: "proj-1",
      description: "Working on dashboard redesign",
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(today.getTime() + 11.5 * 60 * 60 * 1000).toISOString(),
      duration: 150,
      billable: true,
      workspaceId: "ws-1",
      createdAt: now.toISOString(),
      task: { id: "task-1", title: "Dashboard Redesign" },
      project: { id: "proj-1", name: "KnowAI Platform" },
      user: { id: "mock-user", firstName: "Darshan", lastName: "Joshi", avatar: null },
    },
    {
      id: "te-2",
      userId: "mock-user",
      taskId: "task-2",
      projectId: "proj-1",
      description: "API endpoint implementation",
      startTime: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(),
      duration: 120,
      billable: true,
      workspaceId: "ws-1",
      createdAt: now.toISOString(),
      task: { id: "task-2", title: "API Integration" },
      project: { id: "proj-1", name: "KnowAI Platform" },
      user: { id: "mock-user", firstName: "Darshan", lastName: "Joshi", avatar: null },
    },
    {
      id: "te-3",
      userId: "mock-user",
      taskId: null,
      projectId: "proj-2",
      description: "Team standup meeting",
      startTime: new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(today.getTime() + 8.5 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      billable: false,
      workspaceId: "ws-1",
      createdAt: now.toISOString(),
      task: null,
      project: { id: "proj-2", name: "Internal Ops" },
      user: { id: "mock-user", firstName: "Darshan", lastName: "Joshi", avatar: null },
    },
    {
      id: "te-4",
      userId: "mock-user",
      taskId: "task-3",
      projectId: "proj-1",
      description: "Code review and testing",
      startTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000).toISOString(),
      duration: 180,
      billable: true,
      workspaceId: "ws-1",
      createdAt: now.toISOString(),
      task: { id: "task-3", title: "Code Review Sprint 12" },
      project: { id: "proj-1", name: "KnowAI Platform" },
      user: { id: "mock-user", firstName: "Darshan", lastName: "Joshi", avatar: null },
    },
    {
      id: "te-5",
      userId: "mock-user",
      taskId: "task-4",
      projectId: "proj-2",
      description: "Client onboarding documentation",
      startTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(today.getTime() - 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000).toISOString(),
      duration: 120,
      billable: false,
      workspaceId: "ws-1",
      createdAt: now.toISOString(),
      task: { id: "task-4", title: "Onboarding Docs" },
      project: { id: "proj-2", name: "Internal Ops" },
      user: { id: "mock-user", firstName: "Darshan", lastName: "Joshi", avatar: null },
    },
  ];

  return jsonOk({
    success: true,
    data: mockEntries,
    total: mockEntries.length,
    page: 1,
    pageSize: 100,
    totalPages: 1,
  });
}
