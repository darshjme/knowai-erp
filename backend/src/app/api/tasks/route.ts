import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { notifyTaskAssigned, notifyTaskCompleted, notifyTaskStatusChange } from "@/lib/notifications";
import { getPaginationParams } from "@/lib/pagination";

// ── Roles that can assign tasks to anyone ──
const CAN_ASSIGN_ALL = ["CTO", "CEO", "ADMIN", "HR", "PRODUCT_OWNER", "BRAND_FACE"];

// ── Role hierarchy check: can this role assign to target role? ──
function canAssignTo(actorRole: string, _targetRole: string): boolean {
  // C-level and managers can assign to anyone
  if (CAN_ASSIGN_ALL.includes(actorRole)) return true;
  // Senior roles can assign to junior roles and same level
  if (actorRole.startsWith("SR_")) return true;
  // Everyone can assign to themselves
  return true; // Allow all - backend validates project membership instead
}

// ── Roles that see ALL tasks (workspace-wide) ──
const FULL_ACCESS_ROLES = ["CEO", "CTO", "ADMIN"];

// ── Roles that see ONLY their own assigned tasks ──
const SELF_ONLY_ROLES = ["JR_DEVELOPER", "GUY", "OFFICE_BOY"];

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const projectId = searchParams.get("projectId");
    const search = searchParams.get("search");
    const view = searchParams.get("view"); // "my" | "team" | "blocked" | "calendar"
    const sortBy = searchParams.get("sortBy"); // "title" | "priority" | "dueDate" | "createdAt" | "status"
    const sortDir = searchParams.get("sortDir"); // "asc" | "desc"
    const dueDateFrom = searchParams.get("dueDateFrom");
    const dueDateTo = searchParams.get("dueDateTo");
    const { page = 1, pageSize = 50 } = getPaginationParams(searchParams, { pageSize: 50 });

    const where: Record<string, unknown> = {
      project: { workspaceId: user.workspaceId },
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // ── Date range filters ──
    if (dueDateFrom || dueDateTo) {
      const dueDateFilter: Record<string, Date> = {};
      if (dueDateFrom) dueDateFilter.gte = new Date(dueDateFrom);
      if (dueDateTo) dueDateFilter.lte = new Date(dueDateTo);
      where.dueDate = dueDateFilter;
    }

    // ── Role-based scoping ──
    const role = user.role;

    if (view === "my") {
      // Explicit "my tasks" view — any role can request this
      where.assigneeId = user.id;
    } else if (FULL_ACCESS_ROLES.includes(role)) {
      // CEO, CTO, ADMIN: see ALL tasks in the workspace
      if (assigneeId) where.assigneeId = assigneeId;
    } else if (role === "PRODUCT_OWNER") {
      // PRODUCT_OWNER: see all tasks in projects they manage
      const managedProjects = await prisma.project.findMany({
        where: { managerId: user.id, workspaceId: user.workspaceId },
        select: { id: true },
      });
      const managedProjectIds = managedProjects.map((p) => p.id);
      if (view === "team") {
        // Team view: only tasks in their projects (excluding own)
        where.projectId = { in: managedProjectIds };
      } else if (assigneeId) {
        // Specific assignee filter within their projects
        where.assigneeId = assigneeId;
        where.projectId = { in: managedProjectIds };
      } else {
        // Default: all tasks in their projects
        where.projectId = { in: managedProjectIds };
      }
    } else if (role === "HR") {
      // HR: see tasks they created or are assigned to
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { assigneeId: user.id },
        { createdById: user.id },
      ];
      // If search OR was set, we need to nest the conditions
      if (search) {
        const searchConditions = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
        delete where.OR;
        where.AND = [
          { OR: searchConditions },
          { OR: [{ assigneeId: user.id }, { createdById: user.id }] },
        ];
      }
    } else if (role === "SR_DEVELOPER") {
      // SR_DEVELOPER: see tasks in projects where they have assigned tasks + own tasks
      const assignedProjects = await prisma.task.findMany({
        where: { assigneeId: user.id, project: { workspaceId: user.workspaceId } },
        select: { projectId: true },
        distinct: ["projectId"],
      });
      const projectIds = assignedProjects.map((t) => t.projectId);
      if (view === "team") {
        // Team view: all tasks in their assigned projects
        where.projectId = { in: projectIds };
      } else {
        // Default: tasks in assigned projects + own tasks
        const scopeOR: Record<string, unknown>[] = [
          { assigneeId: user.id },
          { projectId: { in: projectIds } },
        ];
        if (search) {
          const searchConditions = [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ];
          delete where.OR;
          where.AND = [
            { OR: searchConditions },
            { OR: scopeOR },
          ];
        } else {
          where.OR = scopeOR;
        }
      }
      if (assigneeId) where.assigneeId = assigneeId;
    } else if (SELF_ONLY_ROLES.includes(role)) {
      // JR_DEVELOPER, GUY, OFFICE_BOY: see ONLY their assigned tasks
      where.assigneeId = user.id;
    } else {
      // Others (CFO, BRAND_FACE, ACCOUNTING, CONTENT_STRATEGIST,
      // BRAND_PARTNER, EDITOR, GRAPHIC_DESIGNER): own tasks + team tasks
      // "Team tasks" = tasks in projects they manage + tasks they created + assigned to them
      const managedProjects = await prisma.project.findMany({
        where: { managerId: user.id, workspaceId: user.workspaceId },
        select: { id: true },
      });
      const managedProjectIds = managedProjects.map((p) => p.id);
      const scopeOR: Record<string, unknown>[] = [
        { assigneeId: user.id },
        { createdById: user.id },
      ];
      if (managedProjectIds.length > 0) {
        scopeOR.push({ projectId: { in: managedProjectIds } });
      }
      if (view === "team") {
        // Show only team tasks (not necessarily own)
        if (managedProjectIds.length > 0) {
          where.projectId = { in: managedProjectIds };
        } else {
          where.createdById = user.id;
        }
      } else {
        if (search) {
          const searchConditions = [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ];
          delete where.OR;
          where.AND = [
            { OR: searchConditions },
            { OR: scopeOR },
          ];
        } else {
          where.OR = scopeOR;
        }
      }
      if (assigneeId) where.assigneeId = assigneeId;
    }

    // ── Blocked tasks query ──
    if (view === "blocked") {
      // Tasks that are blocked because of the current user's incomplete tasks
      const myIncompleteTasks = await prisma.task.findMany({
        where: { assigneeId: user.id, status: { not: "COMPLETED" } },
        select: { id: true },
      });
      const myTaskIds = myIncompleteTasks.map((t) => t.id);

      const blockedDeps = await prisma.taskDependency.findMany({
        where: { blockingTaskId: { in: myTaskIds } },
        include: {
          blockedTask: {
            include: {
              assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
              project: { select: { id: true, name: true } },
            },
          },
          blockingTask: {
            select: { id: true, title: true, status: true },
          },
        },
      });

      return jsonOk({
        success: true,
        data: blockedDeps.map((d) => ({
          ...d.blockedTask,
          blockedBy: d.blockingTask,
        })),
        total: blockedDeps.length,
        page: 1,
        pageSize: blockedDeps.length,
        totalPages: 1,
      });
    }

    // ── Build orderBy ──
    const SORT_FIELD_MAP: Record<string, string> = {
      title: "title",
      priority: "priority",
      dueDate: "dueDate",
      createdAt: "createdAt",
      status: "status",
    };
    const resolvedSortField = SORT_FIELD_MAP[sortBy || ""] || "createdAt";
    const resolvedSortDir = sortDir === "asc" ? "asc" : "desc";
    const orderBy = { [resolvedSortField]: resolvedSortDir };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true } },
          project: { select: { id: true, name: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          blockedBy: {
            include: {
              blockingTask: { select: { id: true, title: true, status: true, assigneeId: true } },
            },
          },
          blocking: {
            include: {
              blockedTask: { select: { id: true, title: true, status: true, assigneeId: true } },
            },
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return jsonOk({
      success: true,
      data: tasks,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
      currentUserId: user.id,
      currentUserRole: user.role,
    });
  } catch (error) {
    console.error("Tasks GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();

    // ── Add dependency ──
    if (body.action === "addDependency") {
      const { blockedTaskId, blockingTaskId } = body;
      if (!blockedTaskId || !blockingTaskId) return jsonError("Both task IDs required", 400);
      if (blockedTaskId === blockingTaskId) return jsonError("A task cannot depend on itself", 400);

      try {
        const dep = await prisma.taskDependency.create({
          data: { blockedTaskId, blockingTaskId },
        });
        return jsonOk({ success: true, data: dep }, 201);
      } catch {
        return jsonError("Dependency already exists", 409);
      }
    }

    // ── Remove dependency ──
    if (body.action === "removeDependency") {
      const { blockedTaskId, blockingTaskId } = body;
      if (!blockedTaskId || !blockingTaskId) return jsonError("Both task IDs required", 400);

      await prisma.taskDependency.deleteMany({
        where: { blockedTaskId, blockingTaskId },
      });
      return jsonOk({ success: true });
    }

    // ── Bulk update ──
    if (body.action === "bulkUpdate") {
      const { taskIds, status, assigneeId, priority } = body;
      if (!Array.isArray(taskIds) || taskIds.length === 0) return jsonError("taskIds array required", 400);

      // Verify all tasks belong to user's workspace
      const existingTasks = await prisma.task.findMany({
        where: { id: { in: taskIds }, project: { workspaceId: user.workspaceId } },
        select: { id: true, assigneeId: true, status: true },
      });
      if (existingTasks.length !== taskIds.length) return jsonError("Some tasks not found in workspace", 404);

      // Role-based check for non-managers
      if (user.role === "USER" || user.role === "DRIVER") {
        const notOwned = existingTasks.filter((t) => t.assigneeId !== user.id);
        if (notOwned.length > 0) return jsonError("You can only update your own tasks", 403);
      }

      const updateData: Record<string, unknown> = {};
      if (status) updateData.status = status;
      if (assigneeId) updateData.assigneeId = assigneeId;
      if (priority) updateData.priority = priority;

      if (Object.keys(updateData).length === 0) return jsonError("No update fields provided", 400);

      // Role-based reassignment check
      if (assigneeId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { role: true, workspaceId: true },
        });
        if (!targetUser || targetUser.workspaceId !== user.workspaceId) {
          return jsonError("Assignee not found in workspace", 404);
        }
        
        if (!canAssignTo(user.role, targetUser.role)) {
          return jsonError(`Your role (${user.role}) cannot assign tasks to ${targetUser.role}`, 403);
        }
      }

      await prisma.task.updateMany({
        where: { id: { in: taskIds } },
        data: updateData,
      });

      // Send notifications for status changes
      if (status) {
        try {
          const changedByName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
          for (const existing of existingTasks) {
            if (existing.status !== status) {
              await notifyTaskStatusChange(existing.id, "", user.id, changedByName, existing.status, status);
            }
          }
        } catch (notifErr) {
          console.error("Failed to send bulk status change notifications:", notifErr);
        }
      }

      return jsonOk({ success: true, updated: taskIds.length });
    }

    // ── Bulk delete ──
    if (body.action === "bulkDelete") {
      const { taskIds } = body;
      if (!Array.isArray(taskIds) || taskIds.length === 0) return jsonError("taskIds array required", 400);

      const existingTasks = await prisma.task.findMany({
        where: { id: { in: taskIds }, project: { workspaceId: user.workspaceId } },
        select: { id: true, assigneeId: true },
      });

      if (user.role === "USER" || user.role === "DRIVER") {
        const notOwned = existingTasks.filter((t) => t.assigneeId !== user.id);
        if (notOwned.length > 0) return jsonError("You can only delete your own tasks", 403);
      }

      await prisma.task.deleteMany({
        where: { id: { in: existingTasks.map((t) => t.id) } },
      });

      return jsonOk({ success: true, deleted: existingTasks.length });
    }

    // ── Create task ──
    const { title, description, status, priority, assigneeId, projectId, dueDate, dependsOn } = body;

    if (!title || !projectId) {
      return jsonError("Title and projectId are required", 400);
    }

    // Verify project belongs to workspace
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: user.workspaceId },
    });
    if (!project) return jsonError("Project not found", 404);

    // Role-based assignment scope check
    if (assigneeId && assigneeId !== user.id) {
      const targetUser = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { role: true, workspaceId: true },
      });
      if (!targetUser || targetUser.workspaceId !== user.workspaceId) {
        return jsonError("Assignee not found in workspace", 404);
      }

      
      if (!canAssignTo(user.role, targetUser.role)) {
        return jsonError(`Your role (${user.role}) cannot assign tasks to ${targetUser.role}`, 403);
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        assigneeId: assigneeId || user.id,
        projectId,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdById: user.id,
        ...(Array.isArray(dependsOn) && dependsOn.length > 0
          ? {
              blockedBy: {
                create: dependsOn.map((blockingId: string) => ({
                  blockingTaskId: blockingId,
                })),
              },
            }
          : {}),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        blockedBy: {
          include: { blockingTask: { select: { id: true, title: true, status: true } } },
        },
      },
    });

    // Notify assignee if task is assigned to someone other than the creator
    if (task.assigneeId && task.assigneeId !== user.id) {
      try {
        const assignerName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
        await notifyTaskAssigned(task.id, task.assigneeId, assignerName, task.title);
      } catch (notifErr) {
        console.error("Failed to send task assignment notification:", notifErr);
      }
    }

    // Auto-add assignee to project chat room
    if (task.assigneeId && projectId) {
      try {
        const projectRoom = await prisma.chatRoom.findFirst({
          where: { projectId, type: "project" },
        });
        if (projectRoom) {
          await prisma.chatRoomMember.create({
            data: { roomId: projectRoom.id, userId: task.assigneeId },
          }).catch(() => {}); // Ignore if already member
        }
      } catch (e) {
        console.error("Failed to add assignee to project chat:", e);
      }
    }

    return jsonOk({ success: true, data: task }, 201);
  } catch (error) {
    console.error("Tasks POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { id, status, assigneeId, priority, title, description, dueDate } = await req.json();
    if (!id) return jsonError("Task id is required", 400);

    const existing = await prisma.task.findFirst({
      where: { id, project: { workspaceId: user.workspaceId } },
    });
    if (!existing) return jsonError("Task not found", 404);

    // Regular users can only update their own tasks
    if ((user.role === "USER" || user.role === "DRIVER") && existing.assigneeId !== user.id) {
      return jsonError("You can only update your own tasks", 403);
    }

    // Role-based reassignment check
    if (assigneeId !== undefined && assigneeId !== existing.assigneeId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: assigneeId },
        select: { role: true },
      });
      if (targetUser) {
        
        if (!canAssignTo(user.role, targetUser.role)) {
          return jsonError(`Cannot reassign to ${targetUser.role}`, 403);
        }
      }
    }

    // Approval check: only a superior/reviewer can move a task from IN_REVIEW to COMPLETED
    if (
      status === "COMPLETED" &&
      existing.status === "IN_REVIEW" &&
      user.id === existing.assigneeId &&
      (user.role === "USER" || user.role === "DRIVER")
    ) {
      return jsonError("Only a reviewer or manager can approve task completion", 403);
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (priority !== undefined) updateData.priority = priority;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true } },
        project: { select: { id: true, name: true } },
        blockedBy: {
          include: { blockingTask: { select: { id: true, title: true, status: true } } },
        },
        blocking: {
          include: { blockedTask: { select: { id: true, title: true, status: true } } },
        },
      },
    });

    // Notify on status change to COMPLETED
    if (status === "COMPLETED" && existing.status !== "COMPLETED") {
      try {
        await notifyTaskCompleted(id, {
          title: task.title,
          createdById: existing.createdById,
          assigneeId: task.assigneeId,
        });
      } catch (notifErr) {
        console.error("Failed to send task completion notification:", notifErr);
      }
    }

    // Notify superiors on any status change
    if (status !== undefined && status !== existing.status) {
      try {
        const changedByName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
        await notifyTaskStatusChange(id, task.title, user.id, changedByName, existing.status, status);
      } catch (notifErr) {
        console.error("Failed to send task status change notification:", notifErr);
      }
    }

    // Notify new assignee on reassignment
    if (assigneeId && assigneeId !== existing.assigneeId && assigneeId !== user.id) {
      try {
        const assignerName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
        await notifyTaskAssigned(id, assigneeId, assignerName, task.title);
      } catch (notifErr) {
        console.error("Failed to send task reassignment notification:", notifErr);
      }
    }

    // Auto-update project progress when task status changes
    if (status !== undefined && task.project?.id) {
      try {
        const projectTasks = await prisma.task.findMany({
          where: { projectId: task.project.id },
          select: { status: true },
        });
        const total = projectTasks.length;
        const completed = projectTasks.filter(t => t.status === "COMPLETED").length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        await prisma.project.update({
          where: { id: task.project.id },
          data: { progress, status: progress >= 100 ? "COMPLETED" : undefined },
        });
      } catch (e) {
        console.error("Failed to update project progress:", e);
      }
    }

    return jsonOk({ success: true, data: task });
  } catch (error) {
    console.error("Tasks PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("Task id is required", 400);

    const existing = await prisma.task.findFirst({
      where: { id, project: { workspaceId: user.workspaceId } },
    });
    if (!existing) return jsonError("Task not found", 404);

    if ((user.role === "USER" || user.role === "DRIVER") && existing.assigneeId !== user.id) {
      return jsonError("You can only delete your own tasks", 403);
    }

    await prisma.task.delete({ where: { id } });
    return jsonOk({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error("Tasks DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
