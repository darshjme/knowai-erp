import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser, getAuthFromHeaders } from "@/lib/api-utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Role helpers ────────────────────────────────────────────────────────────

const EXECUTIVE_ROLES = ["CEO", "CTO", "ADMIN", "CFO"];
const MANAGER_ROLES = ["HR", "PRODUCT_OWNER", "BRAND_PARTNER", "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST"];

function isExecutive(role: string) {
  return EXECUTIVE_ROLES.includes(role);
}

function isManager(role: string) {
  return MANAGER_ROLES.includes(role);
}

// ─── Department grouping for team calendar visibility ────────────────────────

const ROLE_DEPARTMENT_MAP: Record<string, string> = {
  CEO: "Executive",
  CTO: "Executive",
  CFO: "Executive",
  BRAND_FACE: "Executive",
  ADMIN: "Operations",
  HR: "Operations",
  ACCOUNTING: "Finance",
  PRODUCT_OWNER: "Product",
  CONTENT_STRATEGIST: "Content",
  BRAND_PARTNER: "Marketing",
  SR_DEVELOPER: "Engineering",
  JR_DEVELOPER: "Engineering",
  EDITOR: "Content",
  GRAPHIC_DESIGNER: "Design",
  GUY: "General",
  OFFICE_BOY: "General",
};

function getDepartmentForRole(role: string): string {
  return ROLE_DEPARTMENT_MAP[role] || "General";
}

// ─── Get team member IDs for managers ────────────────────────────────────────

async function getTeamMemberIds(userId: string, userRole: string, workspaceId: string): Promise<string[]> {
  // Get all users who report to this person
  const directReports = await prisma.user.findMany({
    where: { reportingTo: userId },
    select: { id: true },
  });

  if (directReports.length > 0) {
    return directReports.map((u) => u.id);
  }

  // Fallback: same department users
  const dept = getDepartmentForRole(userRole);
  const deptUsers = await prisma.user.findMany({
    where: { workspaceId },
    select: { id: true, role: true },
  });

  return deptUsers
    .filter((u) => getDepartmentForRole(u.role) === dept && u.id !== userId)
    .map((u) => u.id);
}

// ─── Build task deadline events ──────────────────────────────────────────────

async function getTaskDeadlineEvents(userIds: string[], dateFilter?: { gte?: Date; lte?: Date }) {
  const where: any = {
    dueDate: { not: null },
    assigneeId: { in: userIds },
    status: { not: "COMPLETED" },
  };

  if (dateFilter) {
    where.dueDate = { ...where.dueDate, ...dateFilter };
  }

  const tasks = await prisma.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      priority: true,
      status: true,
      assigneeId: true,
      projectId: true,
      assignee: {
        select: { id: true, firstName: true, lastName: true },
      },
      project: {
        select: { id: true, name: true },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return tasks.map((task) => ({
    id: `task-${task.id}`,
    title: `[Task] ${task.title}`,
    description: task.description || `${task.project?.name || "No project"} - ${task.status} - ${task.priority} priority`,
    startDate: task.dueDate,
    endDate: task.dueDate,
    color: task.priority === "URGENT" ? "#ef4444" : task.priority === "HIGH" ? "#f97316" : task.priority === "MEDIUM" ? "#eab308" : "#22c55e",
    calendarType: "task_deadline",
    createdById: task.assigneeId,
    createdAt: task.dueDate,
    isTaskDeadline: true,
    taskId: task.id,
    taskStatus: task.status,
    taskPriority: task.priority,
    projectId: task.projectId,
    projectName: task.project?.name || null,
    createdBy: task.assignee
      ? {
          id: task.assignee.id,
          firstName: task.assignee.firstName,
          lastName: task.assignee.lastName,
          email: null,
          avatar: null,
        }
      : null,
  }));
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const calendarType = searchParams.get("type");
    const view = searchParams.get("view"); // personal, team, company
    const includeTaskDeadlines = searchParams.get("includeTaskDeadlines") !== "false"; // default true

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) dateFilter.gte = parsed;
    }
    if (endDate) {
      const parsed = new Date(endDate);
      if (!isNaN(parsed.getTime())) dateFilter.lte = parsed;
    }

    const where: Record<string, unknown> = {};

    if (dateFilter.gte || dateFilter.lte) {
      where.startDate = {};
      if (dateFilter.gte) (where.startDate as Record<string, unknown>).gte = dateFilter.gte;
      if (dateFilter.lte) (where.startDate as Record<string, unknown>).lte = dateFilter.lte;
    }

    if (calendarType) where.calendarType = calendarType;

    // ── Determine visibility scope based on role + view param ──
    const requestedView = view || "auto";
    let visibleUserIds: string[] = [user.id];
    let effectiveView = "personal";

    if (requestedView === "company" || (requestedView === "auto" && isExecutive(user.role))) {
      // CEO/CTO/ADMIN/CFO see company-wide calendar
      if (isExecutive(user.role)) {
        effectiveView = "company";
        // No user filter - see all events
      } else {
        // Non-executives requesting company view fall back to personal
        where.createdById = user.id;
        effectiveView = "personal";
      }
    } else if (requestedView === "team" || (requestedView === "auto" && isManager(user.role))) {
      // Managers see team calendar
      if (isManager(user.role) || isExecutive(user.role)) {
        const teamIds = await getTeamMemberIds(user.id, user.role, user.workspaceId);
        visibleUserIds = [user.id, ...teamIds];
        where.createdById = { in: visibleUserIds };
        effectiveView = "team";
      } else {
        where.createdById = user.id;
        effectiveView = "personal";
      }
    } else {
      // Personal view: only own events
      where.createdById = user.id;
      effectiveView = "personal";
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    // ── Task deadline integration ──
    let taskDeadlines: any[] = [];
    if (includeTaskDeadlines) {
      const taskDateFilter: { gte?: Date; lte?: Date } = {};
      if (dateFilter.gte) taskDateFilter.gte = dateFilter.gte;
      if (dateFilter.lte) taskDateFilter.lte = dateFilter.lte;

      if (effectiveView === "company") {
        // Get all users for task deadlines
        const allUsers = await prisma.user.findMany({
          where: { workspaceId: user.workspaceId },
          select: { id: true },
        });
        taskDeadlines = await getTaskDeadlineEvents(
          allUsers.map((u) => u.id),
          Object.keys(taskDateFilter).length > 0 ? taskDateFilter : undefined
        );
      } else if (effectiveView === "team") {
        taskDeadlines = await getTaskDeadlineEvents(
          visibleUserIds,
          Object.keys(taskDateFilter).length > 0 ? taskDateFilter : undefined
        );
      } else {
        taskDeadlines = await getTaskDeadlineEvents(
          [user.id],
          Object.keys(taskDateFilter).length > 0 ? taskDateFilter : undefined
        );
      }
    }

    // ── Combine events and task deadlines ──
    const calendarEvents = events.map((e) => ({
      ...e,
      isTaskDeadline: false,
    }));

    const allEvents = [...calendarEvents, ...taskDeadlines].sort(
      (a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime()
    );

    return jsonOk({
      success: true,
      data: allEvents,
      meta: {
        view: effectiveView,
        totalCalendarEvents: events.length,
        totalTaskDeadlines: taskDeadlines.length,
        totalCombined: allEvents.length,
      },
    });
  } catch (error) {
    console.error("Calendar GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { action } = body;

    // ── Default: create event (backward compatible) ──
    if (!action || action === "create") {
      const { title, description, startDate: startDateStr, endDate: endDateStr, color, calendarType: eventType, attendeeIds } = body;

      if (!title || !startDateStr || !endDateStr) {
        return jsonError("Title, startDate, and endDate are required", 400);
      }

      const start = new Date(startDateStr);
      const end = new Date(endDateStr);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return jsonError("Invalid date format for startDate or endDate", 400);
      }

      if (end <= start) {
        return jsonError("endDate must be after startDate", 400);
      }

      const event = await prisma.calendarEvent.create({
        data: {
          title,
          description: description || null,
          startDate: start,
          endDate: end,
          color: color || null,
          calendarType: eventType || null,
          createdById: user.id,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      // If attendeeIds provided, create events for each attendee as well
      // (or create notification - depending on your notification system)
      if (attendeeIds && Array.isArray(attendeeIds) && attendeeIds.length > 0) {
        const attendeeEvents = attendeeIds
          .filter((id: string) => id !== user.id)
          .map((attendeeId: string) => ({
            title: `[Invited] ${title}`,
            description: `Invited by ${user.firstName} ${user.lastName}. ${description || ""}`.trim(),
            startDate: start,
            endDate: end,
            color: color || "#6366f1",
            calendarType: "meeting",
            createdById: attendeeId,
          }));

        if (attendeeEvents.length > 0) {
          await prisma.calendarEvent.createMany({
            data: attendeeEvents,
          });
        }
      }

      return jsonOk({ success: true, data: event }, 201);
    }

    // ── Get upcoming deadlines summary ──
    if (action === "deadlines-summary") {
      const daysAhead = parseInt(body.daysAhead || "7", 10);
      const now = new Date();
      const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      let userIdsForTasks = [user.id];

      if (isExecutive(user.role)) {
        const allUsers = await prisma.user.findMany({
          where: { workspaceId: user.workspaceId },
          select: { id: true },
        });
        userIdsForTasks = allUsers.map((u) => u.id);
      } else if (isManager(user.role)) {
        const teamIds = await getTeamMemberIds(user.id, user.role, user.workspaceId);
        userIdsForTasks = [user.id, ...teamIds];
      }

      const upcomingTasks = await prisma.task.findMany({
        where: {
          assigneeId: { in: userIdsForTasks },
          dueDate: { gte: now, lte: futureDate },
          status: { not: "COMPLETED" },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          status: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      });

      const overdueTasks = await prisma.task.findMany({
        where: {
          assigneeId: { in: userIdsForTasks },
          dueDate: { lt: now },
          status: { not: "COMPLETED" },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          status: true,
          assignee: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: "asc" },
      });

      return jsonOk({
        success: true,
        data: {
          upcoming: upcomingTasks,
          overdue: overdueTasks,
          summary: {
            upcomingCount: upcomingTasks.length,
            overdueCount: overdueTasks.length,
            urgentCount: [...upcomingTasks, ...overdueTasks].filter((t) => t.priority === "URGENT").length,
            highCount: [...upcomingTasks, ...overdueTasks].filter((t) => t.priority === "HIGH").length,
          },
        },
      });
    }

    return jsonError(`Unknown action: ${action}`, 400);
  } catch (error) {
    console.error("Calendar POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { id, title, description, startDate, endDate, calendarType, color } =
      await req.json();

    if (!id) {
      return jsonError("Event id is required", 400);
    }

    // Cannot edit task deadline pseudo-events
    if (typeof id === "string" && id.startsWith("task-")) {
      return jsonError("Task deadlines cannot be edited from the calendar. Edit the task directly.", 400);
    }

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) return jsonError("Event not found", 404);

    // Non-executives can only update their own events
    if (!isExecutive(auth.role) && existing.createdById !== auth.userId) {
      return jsonError("Forbidden", 403);
    }

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description || null;
    if (calendarType !== undefined) data.calendarType = calendarType || null;
    if (color !== undefined) data.color = color || null;

    if (startDate !== undefined) {
      const parsed = new Date(startDate);
      if (isNaN(parsed.getTime())) return jsonError("Invalid startDate", 400);
      data.startDate = parsed;
    }
    if (endDate !== undefined) {
      const parsed = new Date(endDate);
      if (isNaN(parsed.getTime())) return jsonError("Invalid endDate", 400);
      data.endDate = parsed;
    }

    // Validate date ordering when either date changes
    const finalStart = data.startDate ? (data.startDate as Date) : existing.startDate;
    const finalEnd = data.endDate ? (data.endDate as Date) : existing.endDate;
    if (finalEnd <= finalStart) {
      return jsonError("endDate must be after startDate", 400);
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return jsonOk({ success: true, data: event });
  } catch (error) {
    console.error("Calendar PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonError("Event id is required", 400);
    }

    // Cannot delete task deadline pseudo-events
    if (id.startsWith("task-")) {
      return jsonError("Task deadlines cannot be deleted from the calendar. Update the task instead.", 400);
    }

    const existing = await prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) return jsonError("Event not found", 404);

    // Non-executives can only delete their own events
    if (!isExecutive(auth.role) && existing.createdById !== auth.userId) {
      return jsonError("Forbidden", 403);
    }

    await prisma.calendarEvent.delete({ where: { id } });

    return jsonOk({ success: true, message: "Event deleted" });
  } catch (error) {
    console.error("Calendar DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
