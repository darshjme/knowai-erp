import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { hrLeaveActionSchema } from "@/schemas/admin";

const HR_ACCESS = ["CTO", "CEO", "CFO", "ADMIN", "HR", "BRAND_FACE"];

export const GET = createHandler(
  { roles: HR_ACCESS },
  async (req, { user }) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, now.getMonth(), 1);
    const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0, 23, 59, 59, 999);
    const todayStart = new Date(currentYear, now.getMonth(), now.getDate());
    const todayEnd = new Date(currentYear, now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      totalEmployees,
      roleGroups,
      statusGroups,
      departmentGroups,
      recentHires,
      pendingPayrolls,
      pendingExpenses,
      payrollAgg,
      expenseAgg,
      pendingLeaves,
      activeComplaints,
      onLeaveToday,
      pendingVerifications,
      allEmployees,
    ] = await Promise.all([
      prisma.user.count({ where: { workspaceId: user.workspaceId } }),

      prisma.user.groupBy({
        by: ["role"],
        where: { workspaceId: user.workspaceId },
        _count: { _all: true },
      }),

      prisma.user.groupBy({
        by: ["status"],
        where: { workspaceId: user.workspaceId },
        _count: { _all: true },
      }),

      prisma.user.groupBy({
        by: ["department"],
        where: { workspaceId: user.workspaceId },
        _count: { _all: true },
      }),

      prisma.user.findMany({
        where: { workspaceId: user.workspaceId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          department: true,
          avatar: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),

      prisma.payroll.count({
        where: { status: "PENDING", month: currentMonth, year: currentYear },
      }),

      prisma.expense.count({ where: { status: "SUBMITTED" } }),

      prisma.payroll.aggregate({
        where: { month: currentMonth, year: currentYear },
        _sum: { totalPay: true },
      }),

      prisma.expense.aggregate({
        where: {
          status: "APPROVED",
          expenseDate: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),

      // Pending leave requests
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),

      // Active complaints (OPEN or UNDER_REVIEW or ESCALATED)
      prisma.complaint.count({
        where: {
          workspaceId: user.workspaceId,
          status: { in: ["OPEN", "UNDER_REVIEW", "ESCALATED"] },
        },
      }),

      // Who is on leave today
      prisma.leaveRequest.findMany({
        where: {
          status: "APPROVED",
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart },
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, department: true, role: true, avatar: true },
          },
        },
      }),

      // Pending identity document verifications
      prisma.identityDocument.count({
        where: { status: "PENDING" },
      }),

      // All employees for directory
      prisma.user.findMany({
        where: { workspaceId: user.workspaceId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          department: true,
          status: true,
          phone: true,
          avatar: true,
          createdAt: true,
        },
        orderBy: { firstName: "asc" },
      }),
    ]);

    // Build byRole map
    const byRole: Record<string, number> = {
      ADMIN: 0, HR: 0, PROJECT_MANAGER: 0, TEAM_MANAGER: 0, USER: 0, DRIVER: 0,
    };
    for (const group of roleGroups) {
      byRole[group.role] = group._count._all;
    }

    // Build byStatus map
    const byStatus: Record<string, number> = { ONLINE: 0, OFFLINE: 0, AWAY: 0 };
    for (const group of statusGroups) {
      byStatus[group.status] = group._count._all;
    }

    // Build byDepartment map
    const byDepartment: Record<string, number> = {};
    for (const group of departmentGroups) {
      const dept = group.department || "Unassigned";
      byDepartment[dept] = group._count._all;
    }

    return jsonOk({
      success: true,
      data: {
        totalEmployees,
        byRole,
        byStatus,
        byDepartment,
        recentHires,
        pendingPayrolls,
        pendingExpenses,
        pendingLeaves,
        activeComplaints,
        pendingVerifications,
        onLeaveToday: onLeaveToday.map((l) => ({
          id: l.id,
          employee: l.employee,
          type: l.type,
          startDate: l.startDate,
          endDate: l.endDate,
        })),
        totalPayrollThisMonth: payrollAgg._sum.totalPay ?? 0,
        totalExpensesThisMonth: expenseAgg._sum.amount ?? 0,
        employees: allEmployees,
      },
    });
  }
);

// ─── PATCH — Quick approve a leave from HR dashboard ─────────────────────────

export const PATCH = createHandler(
  { roles: ["HR", "ADMIN"], schema: hrLeaveActionSchema, rateLimit: "write" },
  async (req, { user, body }) => {
    const { leaveId, action } = body;

    const leave = await prisma.leaveRequest.findUnique({ where: { id: leaveId } });
    if (!leave) return jsonError("Leave request not found", 404);
    if (leave.status !== "PENDING") {
      return jsonError(`Cannot ${action} a leave that is already ${leave.status}`, 400);
    }

    const data: Record<string, unknown> = {
      approverId: user.id,
    };

    if (action === "approve") {
      data.status = "APPROVED";
      data.approvedAt = new Date();
    } else {
      data.status = "REJECTED";
      data.rejectedAt = new Date();
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, department: true },
        },
      },
    });

    return jsonOk({ success: true, data: updated });
  }
);
