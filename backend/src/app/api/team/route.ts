import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { teamCreateSchema, teamPatchSchema } from "@/schemas/admin";

// Roles that can see all team members with full details
const FULL_ACCESS_ROLES = ["CEO", "CTO", "ADMIN", "HR"];

// Roles that can add/onboard new team members
const ONBOARDING_ROLES = ["CEO", "CTO", "ADMIN", "HR"];

// Full select for privileged roles
const FULL_MEMBER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  avatar: true,
  status: true,
  department: true,
  phone: true,
  createdAt: true,
  _count: {
    select: {
      tasks: true,
      projects: true,
    },
  },
} as const;

// Limited select for unprivileged roles (no salary/personal data)
const LIMITED_MEMBER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  avatar: true,
  department: true,
} as const;

// Any authenticated user can view the team directory (with varying detail levels)
export const GET = createHandler(
  {},
  async (req, { user }) => {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const department = searchParams.get("department");
    const memberId = searchParams.get("id");

    const hasFullAccess = FULL_ACCESS_ROLES.includes(user.role);
    const isProductOwner = user.role === "PRODUCT_OWNER";

    // Single member detail
    if (memberId) {
      if (hasFullAccess) {
        // Full access: return all details
        const member = await prisma.user.findFirst({
          where: { id: memberId, workspaceId: user.workspaceId },
          select: {
            ...FULL_MEMBER_SELECT,
            tasks: {
              select: { id: true, title: true, status: true, priority: true },
              take: 10,
              orderBy: { updatedAt: "desc" },
            },
            projects: {
              select: { id: true, name: true, status: true },
              take: 5,
              orderBy: { updatedAt: "desc" },
            },
          },
        });

        if (!member) return jsonError("Member not found", 404);

        const [completedTasks, totalTasks] = await Promise.all([
          prisma.task.count({ where: { assigneeId: memberId, status: "COMPLETED" } }),
          prisma.task.count({ where: { assigneeId: memberId } }),
        ]);

        return jsonOk({
          success: true,
          data: {
            ...member,
            performance: {
              completedTasks,
              totalTasks,
              completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            },
          },
        });
      }

      if (isProductOwner) {
        // PRODUCT_OWNER: can see full details of their own team members
        const member = await prisma.user.findFirst({
          where: {
            id: memberId,
            workspaceId: user.workspaceId,
            ...(user.department ? { department: user.department } : {}),
          },
          select: {
            ...FULL_MEMBER_SELECT,
            tasks: {
              select: { id: true, title: true, status: true, priority: true },
              take: 10,
              orderBy: { updatedAt: "desc" },
            },
            projects: {
              select: { id: true, name: true, status: true },
              take: 5,
              orderBy: { updatedAt: "desc" },
            },
          },
        });

        if (!member) return jsonError("Member not found", 404);

        const [completedTasks, totalTasks] = await Promise.all([
          prisma.task.count({ where: { assigneeId: memberId, status: "COMPLETED" } }),
          prisma.task.count({ where: { assigneeId: memberId } }),
        ]);

        return jsonOk({
          success: true,
          data: {
            ...member,
            performance: {
              completedTasks,
              totalTasks,
              completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            },
          },
        });
      }

      // Others: limited directory view only
      const member = await prisma.user.findFirst({
        where: { id: memberId, workspaceId: user.workspaceId },
        select: LIMITED_MEMBER_SELECT,
      });

      if (!member) return jsonError("Member not found", 404);
      return jsonOk({ success: true, data: member });
    }

    // --- List view ---

    const where: Record<string, unknown> = {
      workspaceId: user.workspaceId,
    };

    // PRODUCT_OWNER: scoped to their department/team
    if (isProductOwner && user.department) {
      where.department = user.department;
    }

    if (role) where.role = role;
    if (status) where.status = status;
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        ...(hasFullAccess || isProductOwner
          ? [
              { email: { contains: search, mode: "insensitive" } },
              { department: { contains: search, mode: "insensitive" } },
            ]
          : [{ department: { contains: search, mode: "insensitive" } }]),
      ];
    }

    if (hasFullAccess || isProductOwner) {
      // Full detail listing
      const members = await prisma.user.findMany({
        where,
        select: FULL_MEMBER_SELECT,
        orderBy: { firstName: "asc" },
      });

      const departments = [...new Set(members.map((m) => m.department).filter(Boolean))] as string[];

      return jsonOk({
        success: true,
        data: members,
        total: members.length,
        departments,
        userRole: user.role,
        userDepartment: user.department || null,
      });
    }

    // Others: limited directory (name, role, department only)
    const members = await prisma.user.findMany({
      where,
      select: LIMITED_MEMBER_SELECT,
      orderBy: { firstName: "asc" },
    });

    const departments = [...new Set(members.map((m) => m.department).filter(Boolean))] as string[];

    return jsonOk({
      success: true,
      data: members,
      total: members.length,
      departments,
      userRole: user.role,
      userDepartment: user.department || null,
    });
  }
);

// Only CEO/CTO/ADMIN/HR can create (onboard) new team members
const ROLE_CREATION_PERMISSIONS: Record<string, string[]> = {
  CEO: ["CTO", "CFO", "BRAND_FACE", "ADMIN", "HR", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "PRODUCT_OWNER", "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST", "BRAND_PARTNER", "SR_DEVELOPER", "SR_EDITOR", "JR_EDITOR", "SR_GRAPHIC_DESIGNER", "JR_GRAPHIC_DESIGNER", "JR_DEVELOPER", "SR_BRAND_STRATEGIST", "JR_BRAND_STRATEGIST", "SR_SCRIPT_WRITER", "JR_SCRIPT_WRITER", "GUY", "DRIVER", "OFFICE_BOY"],
  CTO: ["ADMIN", "HR", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "PRODUCT_OWNER", "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST", "BRAND_PARTNER", "SR_DEVELOPER", "SR_EDITOR", "JR_EDITOR", "SR_GRAPHIC_DESIGNER", "JR_GRAPHIC_DESIGNER", "JR_DEVELOPER", "SR_BRAND_STRATEGIST", "JR_BRAND_STRATEGIST", "SR_SCRIPT_WRITER", "JR_SCRIPT_WRITER", "GUY", "DRIVER", "OFFICE_BOY"],
  ADMIN: ["HR", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "PRODUCT_OWNER", "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST", "BRAND_PARTNER", "SR_DEVELOPER", "SR_EDITOR", "JR_EDITOR", "SR_GRAPHIC_DESIGNER", "JR_GRAPHIC_DESIGNER", "JR_DEVELOPER", "SR_BRAND_STRATEGIST", "JR_BRAND_STRATEGIST", "SR_SCRIPT_WRITER", "JR_SCRIPT_WRITER", "GUY", "DRIVER", "OFFICE_BOY"],
  HR: ["SR_ACCOUNTANT", "JR_ACCOUNTANT", "PRODUCT_OWNER", "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST", "BRAND_PARTNER", "SR_DEVELOPER", "SR_EDITOR", "JR_EDITOR", "SR_GRAPHIC_DESIGNER", "JR_GRAPHIC_DESIGNER", "JR_DEVELOPER", "SR_BRAND_STRATEGIST", "JR_BRAND_STRATEGIST", "SR_SCRIPT_WRITER", "JR_SCRIPT_WRITER", "GUY", "DRIVER", "OFFICE_BOY"],
};

export const POST = createHandler(
  { roles: ONBOARDING_ROLES, schema: teamCreateSchema, rateLimit: "write" },
  async (req, { user, body }) => {
    const { email, password, firstName, lastName, role, department, phone } = body;

    const allowedRoles = ROLE_CREATION_PERMISSIONS[user.role] || [];
    if (!allowedRoles.includes(role)) {
      return jsonError(
        "You don't have permission to add members with this role",
        403
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError("Email is already taken", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role as any,
        department: department || null,
        phone: phone || null,
        status: "OFFLINE",
        workspaceId: user.workspaceId,
      },
      select: FULL_MEMBER_SELECT,
    });

    return jsonOk({ success: true, data: newUser }, 201);
  }
);

export const PATCH = createHandler(
  { roles: FULL_ACCESS_ROLES, schema: teamPatchSchema, rateLimit: "write" },
  async (req, { user, body }) => {
    const { id, role, status, department, phone } = body;

    if (role !== undefined) {
      if (id === user.id) {
        return jsonError("Cannot change your own role", 403);
      }
      // Prevent promoting to CEO (only one CEO)
      if (role === "CEO") {
        return jsonError("Cannot promote someone to CEO", 403);
      }
      // CTO/ADMIN/HR cannot promote to CEO or CTO (only CEO can)
      if (role === "CTO" && user.role !== "CEO") {
        return jsonError("Only CEO can promote someone to CTO", 403);
      }
    }

    const data: Record<string, unknown> = {};
    if (role !== undefined) {
      data.role = role;
      // Bump tokenVersion to invalidate existing JWTs with the old role
      data.tokenVersion = { increment: 1 };
    }
    if (status !== undefined) data.status = status;
    if (department !== undefined) data.department = department || null;
    if (phone !== undefined) data.phone = phone || null;

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: FULL_MEMBER_SELECT,
    });

    return jsonOk({ success: true, data: updated });
  }
);

export const DELETE = createHandler(
  { roles: FULL_ACCESS_ROLES, rateLimit: "write" },
  async (req, { user }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonError("Member ID is required", 400);
    }

    if (id === user.id) {
      return jsonError("Cannot delete yourself", 403);
    }

    await prisma.user.delete({ where: { id } });

    return jsonOk({ success: true, message: "Member deleted successfully" });
  }
);
