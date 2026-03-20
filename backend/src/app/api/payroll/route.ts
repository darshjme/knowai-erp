import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import {
  createPayrollSchema,
  addPayrollLogSchema,
  updatePayrollSchema,
} from "@/schemas/payroll";
import { logAudit } from "@/lib/audit";

// ─── Role Sets ───────────────────────────────────────────────────────────────

/** CTO, CEO, CFO, ADMIN, ACCOUNTANTS — full visibility + create/process */
const PAYROLL_FULL_ACCESS = ["CTO", "CEO", "CFO", "ADMIN", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "BRAND_FACE"] as const;

/** HR — full visibility + create (no process) */
const PAYROLL_CREATE_ROLES = [...PAYROLL_FULL_ACCESS, "HR"] as const;

function canSeeAllPayrolls(role: string) {
  return PAYROLL_CREATE_ROLES.some((r) => r === role);
}

function canCreatePayroll(role: string) {
  return PAYROLL_CREATE_ROLES.some((r) => r === role);
}

function canProcessPayroll(role: string) {
  return PAYROLL_FULL_ACCESS.some((r) => r === role);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function recalculatePayrollStatus(payrollId: string) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; totalPay: number; status: string }>>`
      SELECT id, "totalPay", status FROM payrolls WHERE id = ${payrollId} FOR UPDATE
    `;
    if (!rows || rows.length === 0) return;
    const payroll = rows[0];

    const aggregate = await tx.payrollLog.aggregate({
      where: { payrollId },
      _sum: { amount: true },
    });

    const totalPaid = aggregate._sum.amount ?? 0;
    const newStatus = totalPaid >= payroll.totalPay ? "PAID" : "PENDING";
    const paidOn = newStatus === "PAID" ? new Date() : null;

    await tx.payroll.update({
      where: { id: payrollId },
      data: { status: newStatus, paidOn },
    });
  });
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export const GET = createHandler({}, async (req, { user }) => {
  const { searchParams } = new URL(req.url);
  const payrollId = searchParams.get("payrollId");
  const logsFlag = searchParams.get("logs");
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const employeeId = searchParams.get("employeeId");
  const status = searchParams.get("status");

  // ── Single payroll with logs ──────────────────────────────────────────
  if (payrollId && logsFlag === "true") {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
        logs: {
          include: {
            paidBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!payroll) return jsonError("Payroll not found", 404);

    // Access control: only privileged roles can view any payroll; others see own only
    if (!canSeeAllPayrolls(user.role) && payroll.employeeId !== user.id) {
      return jsonError("Forbidden", 403);
    }

    const aggregate = await prisma.payrollLog.aggregate({
      where: { payrollId },
      _sum: { amount: true },
    });

    const totalPaid = aggregate._sum.amount ?? 0;
    const remaining = Math.max(0, payroll.totalPay - totalPaid);

    return jsonOk({
      success: true,
      data: {
        ...payroll,
        totalPaid,
        remaining,
      },
    });
  }

  // ── List payrolls ─────────────────────────────────────────────────────
  const where: Record<string, unknown> = {
    employee: { workspaceId: user.workspaceId },
  };

  if (canSeeAllPayrolls(user.role)) {
    if (employeeId) where.employeeId = employeeId;
  } else {
    where.employeeId = user.id;
  }

  if (month) where.month = parseInt(month, 10);
  if (year) where.year = parseInt(year, 10);
  if (status) where.status = status;

  const payrolls = await prisma.payroll.findMany({
    where,
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          department: true,
        },
      },
      logs: {
        select: {
          id: true, amount: true, mode: true, bankRef: true,
          purpose: true, remarks: true, paidAt: true, createdAt: true,
          paidBy: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" as const },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  // Attach totalPaid / remaining to each payroll
  const data = payrolls.map((p) => {
    const totalPaid = p.logs.reduce((s, l) => s + l.amount, 0);
    return {
      ...p,
      totalPaid,
      remaining: Math.max(0, p.totalPay - totalPaid),
    };
  });

  return jsonOk({ success: true, data, total: data.length });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

export const POST = createHandler(
  { rateLimit: "write" },
  async (req, { user }) => {
    const rawBody = await req.json();

    // ── Add payment log (process payroll) ─────────────────────────────────
    if (rawBody.action === "addLog") {
      if (!canProcessPayroll(user.role)) {
        return jsonError(
          "Only CEO, CFO, Admin, or Accounting can process payroll payments",
          403
        );
      }

      const parsed = addPayrollLogSchema.safeParse(rawBody);
      if (!parsed.success) {
        return jsonError(
          parsed.error.issues.map((i) => i.message).join("; "),
          400
        );
      }
      const body = parsed.data;

      // Verify payroll exists
      const payroll = await prisma.payroll.findUnique({
        where: { id: body.payrollId },
      });
      if (!payroll) return jsonError("Payroll not found", 404);

      const log = await prisma.payrollLog.create({
        data: {
          payrollId: body.payrollId,
          amount: Math.round(body.amount),
          mode: body.mode,
          bankRef: body.bankRef || null,
          purpose: body.purpose,
          remarks: body.remarks || null,
          paidById: user.id,
          paidAt: new Date(),
        },
        include: {
          paidBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Auto-update payroll status
      await recalculatePayrollStatus(body.payrollId);

      // Audit log: payroll payment
      logAudit({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "CREATE",
        entity: "PAYROLL",
        entityId: body.payrollId,
        entityName: `Payment of ${Math.round(body.amount)}`,
        description: `Processed payroll payment of ${Math.round(body.amount)} via ${body.mode} for payroll ${body.payrollId}`,
        metadata: { amount: Math.round(body.amount), mode: body.mode, purpose: body.purpose, logId: log.id },
        workspaceId: user.workspaceId,
      });

      return jsonOk({ success: true, data: log }, 201);
    }

    // ── Create payroll ────────────────────────────────────────────────────
    if (!canCreatePayroll(user.role)) {
      return jsonError(
        "Only CEO, CFO, Admin, Accounting, or HR can create payroll records",
        403
      );
    }

    const parsed = createPayrollSchema.safeParse(rawBody);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues.map((i) => i.message).join("; "),
        400
      );
    }
    const body = parsed.data;

    // Validate employee exists and belongs to same workspace
    const employee = await prisma.user.findFirst({ where: { id: body.employeeId, workspaceId: user.workspaceId } });
    if (!employee) return jsonError("Employee not found", 404);

    const calculatedTotal =
      body.totalPay !== undefined && body.totalPay !== null
        ? body.totalPay
        : body.basicPay + body.hra + body.transport + body.bonus - body.deductions;

    const payroll = await prisma.payroll.create({
      data: {
        employeeId: body.employeeId,
        month: body.month,
        year: body.year,
        basicPay: body.basicPay,
        hra: body.hra,
        transport: body.transport,
        bonus: body.bonus,
        deductions: body.deductions,
        totalPay: calculatedTotal,
        notes: body.notes,
        workingDays: body.workingDays ?? 22,
        presentDays: body.presentDays ?? 0,
        absentDays: body.absentDays ?? 0,
        leaveDays: body.leaveDays ?? 0,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
    });

    // Audit log: payroll creation
    const empName = `${employee.firstName} ${employee.lastName}`;
    logAudit({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: "CREATE",
      entity: "PAYROLL",
      entityId: payroll.id,
      entityName: `Payroll ${body.month}/${body.year} - ${empName}`,
      description: `Created payroll for ${empName} (${body.month}/${body.year}), total: ${calculatedTotal}`,
      metadata: { employeeId: body.employeeId, month: body.month, year: body.year, totalPay: calculatedTotal },
      workspaceId: user.workspaceId,
    });

    return jsonOk({ success: true, data: payroll }, 201);
  }
);

// ─── PATCH ────────────────────────────────────────────────────────────────────

export const PATCH = createHandler(
  {
    roles: ["CTO", "CEO", "CFO", "ADMIN", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "BRAND_FACE"],
    schema: updatePayrollSchema,
    rateLimit: "write",
  },
  async (_req, { user, body }) => {
    const { id, ...rawUpdates } = body;

    // Validate the payroll record exists
    const existing = await prisma.payroll.findUnique({ where: { id } });
    if (!existing) return jsonError("Payroll record not found", 404);

    // Whitelist allowed update fields to prevent arbitrary field injection
    const allowedFields = [
      "basicPay", "hra", "transport", "bonus", "deductions", "totalPay",
      "notes", "workingDays", "presentDays", "absentDays", "leaveDays",
      "status", "month", "year",
    ] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if ((rawUpdates as Record<string, unknown>)[key] !== undefined) {
        updates[key] = (rawUpdates as Record<string, unknown>)[key];
      }
    }

    // If status is being changed to PAID, set paidOn
    if (updates.status === "PAID") {
      updates.paidOn = new Date();
    }

    const payroll = await prisma.payroll.update({
      where: { id },
      data: updates,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            department: true,
          },
        },
      },
    });

    // Audit log: payroll update
    const payrollEmpName = `${payroll.employee.firstName} ${payroll.employee.lastName}`;
    logAudit({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: "UPDATE",
      entity: "PAYROLL",
      entityId: id,
      entityName: `Payroll ${payroll.month}/${payroll.year} - ${payrollEmpName}`,
      description: `Updated payroll for ${payrollEmpName} (${payroll.month}/${payroll.year})`,
      metadata: { updates, employeeId: payroll.employeeId },
      workspaceId: user.workspaceId,
    });

    return jsonOk({ success: true, data: payroll });
  }
);

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const DELETE = createHandler(
  {
    roles: ["CEO", "CFO", "ADMIN"],
    rateLimit: "write",
  },
  async (req, { user }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const logId = searchParams.get("logId");

    // ── Delete a payment log ──────────────────────────────────────────────
    if (logId) {
      const log = await prisma.payrollLog.findUnique({
        where: { id: logId },
      });
      if (!log) return jsonError("Payment log not found", 404);

      await prisma.payrollLog.delete({ where: { id: logId } });

      // Recalculate payroll status after removing a log
      await recalculatePayrollStatus(log.payrollId);

      // Audit log: payment log deletion
      logAudit({
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        action: "DELETE",
        entity: "PAYROLL",
        entityId: log.payrollId,
        entityName: `Payment log ${logId}`,
        description: `Deleted payment log of ${log.amount} from payroll ${log.payrollId}`,
        metadata: { logId, amount: log.amount, payrollId: log.payrollId },
        workspaceId: user.workspaceId,
      });

      return jsonOk({
        success: true,
        message: "Payment log deleted successfully",
      });
    }

    // ── Delete a payroll (existing) ───────────────────────────────────────
    if (!id) return jsonError("Payroll id or logId is required", 400);

    // Verify payroll belongs to same workspace
    const payrollToDelete = await prisma.payroll.findFirst({
      where: { id, employee: { workspaceId: user.workspaceId } },
    });
    if (!payrollToDelete) return jsonError("Payroll not found", 404);

    // Delete associated logs first, then the payroll record
    await prisma.payrollLog.deleteMany({ where: { payrollId: id } });
    await prisma.payroll.delete({ where: { id } });

    // Audit log: payroll deletion
    logAudit({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: "DELETE",
      entity: "PAYROLL",
      entityId: id,
      entityName: `Payroll ${payrollToDelete.month}/${payrollToDelete.year}`,
      description: `Deleted payroll record ${payrollToDelete.month}/${payrollToDelete.year} (total: ${payrollToDelete.totalPay})`,
      metadata: { employeeId: payrollToDelete.employeeId, month: payrollToDelete.month, year: payrollToDelete.year },
      workspaceId: user.workspaceId,
    });

    return jsonOk({
      success: true,
      message: "Payroll record deleted successfully",
    });
  }
);
