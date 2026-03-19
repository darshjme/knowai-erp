import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// Roles that can see ALL projects
const FULL_ACCESS_ROLES = ["CEO", "CTO", "ADMIN", "PRODUCT_OWNER"];
// Roles that can see all projects for financial / team-management context
const BROAD_ACCESS_ROLES = ["CFO", "HR"];
// Roles that see only projects they're assigned to (as manager)
const ASSIGNED_PROJECT_ROLES = ["SR_DEVELOPER"];
// Roles that see only projects where they have tasks
const TASK_BASED_ROLES = ["JR_DEVELOPER", "SR_EDITOR", "JR_EDITOR", "SR_GRAPHIC_DESIGNER", "JR_GRAPHIC_DESIGNER", "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST", "BRAND_PARTNER", "BRAND_FACE", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "SR_BRAND_STRATEGIST", "JR_BRAND_STRATEGIST", "SR_SCRIPT_WRITER", "JR_SCRIPT_WRITER"];
// Roles with NO project access
const NO_ACCESS_ROLES = ["GUY", "OFFICE_BOY"];

// Roles that can create projects
const CAN_CREATE_ROLES = ["CEO", "CTO", "ADMIN", "PRODUCT_OWNER"];

/**
 * Build a role-scoped `where` clause addition for the current user.
 * Returns `null` if the user should see nothing.
 */
function buildRoleScopeFilter(user: { id: string; role: string; workspaceId: string }): Record<string, unknown> | null {
  const role = user.role;

  if (NO_ACCESS_ROLES.includes(role)) return null;

  // Full-access and broad-access roles see everything in the workspace
  if (FULL_ACCESS_ROLES.includes(role) || BROAD_ACCESS_ROLES.includes(role)) {
    return {};
  }

  // SR_DEVELOPER: projects they manage OR are assigned tasks in
  if (ASSIGNED_PROJECT_ROLES.includes(role)) {
    return {
      OR: [
        { managerId: user.id },
        { tasks: { some: { assigneeId: user.id } } },
      ],
    };
  }

  // Task-based roles: projects where they have at least one task
  if (TASK_BASED_ROLES.includes(role)) {
    return {
      tasks: { some: { assigneeId: user.id } },
    };
  }

  // Unknown / unmapped role — deny by default
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    // Check role access
    const roleFilter = buildRoleScopeFilter(user);
    if (roleFilter === null) {
      return jsonOk({
        success: true,
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        departments: [],
      });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const managerId = searchParams.get("managerId");
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const detail = searchParams.get("detail"); // project ID for detail view

    // ── Single project detail view ──
    if (detail) {
      const project = await prisma.project.findFirst({
        where: {
          id: detail,
          workspaceId: user.workspaceId,
          ...roleFilter,
        },
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              department: true,
            },
          },
          tasks: {
            include: {
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  avatar: true,
                  role: true,
                  department: true,
                },
              },
              blockedBy: {
                include: {
                  blockingTask: { select: { id: true, title: true, status: true } },
                },
              },
              blocking: {
                include: {
                  blockedTask: { select: { id: true, title: true, status: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!project) return jsonError("Project not found", 404);

      // Extract unique team members from task assignees
      const teamMap = new Map<string, typeof project.manager>();
      if (project.manager) {
        teamMap.set(project.manager.id, project.manager);
      }
      for (const task of project.tasks) {
        if (task.assignee && !teamMap.has(task.assignee.id)) {
          teamMap.set(task.assignee.id, task.assignee);
        }
      }

      return jsonOk({
        success: true,
        data: {
          ...project,
          teamMembers: Array.from(teamMap.values()),
        },
      });
    }

    // ── List projects ──
    const where: Record<string, unknown> = {
      workspaceId: user.workspaceId,
      ...roleFilter,
    };

    if (status) where.status = status;
    if (managerId) where.managerId = managerId;
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (department) {
      where.manager = { department: { contains: department, mode: "insensitive" } };
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
              department: true,
            },
          },
          tasks: {
            select: {
              id: true,
              status: true,
              priority: true,
              dueDate: true,
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          _count: {
            select: { tasks: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.project.count({ where }),
    ]);

    // Get unique departments for filter
    const departments = await prisma.user.findMany({
      where: {
        workspaceId: user.workspaceId,
        department: { not: null },
      },
      select: { department: true },
      distinct: ["department"],
    });

    return jsonOk({
      success: true,
      data: projects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      departments: departments
        .map((d) => d.department)
        .filter(Boolean)
        .sort(),
    });
  } catch (error) {
    console.error("Projects GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!CAN_CREATE_ROLES.includes(user.role)) {
      return jsonError("You do not have permission to create projects", 403);
    }

    const body = await req.json();
    const { name, description, status, dueDate, members, discussionTime, discussionFrequency } = body;

    if (!name) {
      return jsonError("Project name is required", 400);
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        status: status || "PLANNING",
        dueDate: dueDate ? new Date(dueDate) : null,
        managerId: user.id,
        workspaceId: user.workspaceId,
        members: Array.isArray(members) ? members : [],
        discussionTime: discussionTime || null,
        discussionFrequency: discussionFrequency || null,
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
            department: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    // Auto-create project chat room and add all members
    try {
      const chatRoom = await prisma.chatRoom.create({
        data: {
          name: project.name,
          type: "project",
          projectId: project.id,
          createdById: user.id,
        },
      });
      // Save chatRoomId on project
      await prisma.project.update({ where: { id: project.id }, data: { chatRoomId: chatRoom.id } });

      // Add project manager as member
      await prisma.chatRoomMember.create({
        data: { roomId: chatRoom.id, userId: user.id },
      }).catch(() => {});

      // Add all project members to chat
      if (Array.isArray(members) && members.length > 0) {
        for (const memberId of members) {
          if (memberId !== user.id) {
            await prisma.chatRoomMember.create({
              data: { roomId: chatRoom.id, userId: memberId },
            }).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error("Failed to create project chat room:", e);
    }

    return jsonOk({ success: true, data: project }, 201);
  } catch (error) {
    console.error("Projects POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { id, name, description, status, dueDate, members: newMembers, discussionTime, discussionFrequency } = body;
    if (!id) return jsonError("Project id is required", 400);

    const existing = await prisma.project.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!existing) return jsonError("Project not found", 404);

    if (user.role !== "ADMIN" && user.role !== "PRODUCT_OWNER" && existing.managerId !== user.id) {
      return jsonError("Not authorized to update this project", 403);
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (newMembers !== undefined && Array.isArray(newMembers)) data.members = newMembers;
    if (discussionTime !== undefined) data.discussionTime = discussionTime;
    if (discussionFrequency !== undefined) data.discussionFrequency = discussionFrequency;

    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        manager: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, department: true },
        },
        tasks: {
          select: {
            id: true,
            status: true,
            priority: true,
            dueDate: true,
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    return jsonOk({ success: true, data: project });
  } catch (error) {
    console.error("Projects PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("Project id is required", 400);

    const existing = await prisma.project.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!existing) return jsonError("Project not found", 404);

    if (user.role !== "ADMIN" && existing.managerId !== user.id) {
      return jsonError("Not authorized to delete this project", 403);
    }

    await prisma.project.delete({ where: { id } });
    return jsonOk({ success: true, message: "Project deleted" });
  } catch (error) {
    console.error("Projects DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
