import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

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

// Recalculate payroll status inside an interactive transaction to prevent
// race conditions (double-payment). Uses SELECT ... FOR UPDATE semantics
// via Prisma's interactive transactions.
//
//   Thread A: BEGIN TX → lock payroll row → calc total → update → COMMIT
//   Thread B: BEGIN TX → lock payroll row → BLOCKED → reads updated state → no-op
//
async function recalculatePayrollStatus(payrollId: string) {
  await prisma.$transaction(async (tx) => {
    // Lock the payroll row for this transaction
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

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

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
    const where: Record<string, unknown> = {};

    if (canSeeAllPayrolls(user.role)) {
      // CEO, CFO, ADMIN, ACCOUNTING, HR — can see all payrolls
      if (employeeId) where.employeeId = employeeId;
    } else {
      // Everyone else — own payroll records only
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
  } catch (error) {
    console.error("Payroll GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();

    // ── Add payment log (process payroll) ─────────────────────────────────
    if (body.action === "addLog") {
      if (!canProcessPayroll(user.role)) {
        return jsonError(
          "Only CEO, CFO, Admin, or Accounting can process payroll payments",
          403
        );
      }

      const { payrollId, amount, mode, bankRef, purpose, remarks } = body;

      if (!payrollId || !amount || !mode || !purpose) {
        return jsonError(
          "payrollId, amount, mode, and purpose are required",
          400
        );
      }

      const validModes = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"];
      if (!validModes.includes(mode)) {
        return jsonError(
          `Invalid mode. Must be one of: ${validModes.join(", ")}`,
          400
        );
      }

      // Verify payroll exists
      const payroll = await prisma.payroll.findUnique({
        where: { id: payrollId },
      });
      if (!payroll) return jsonError("Payroll not found", 404);

      const log = await prisma.payrollLog.create({
        data: {
          payrollId,
          amount: Math.round(amount),
          mode,
          bankRef: bankRef || null,
          purpose,
          remarks: remarks || null,
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
      await recalculatePayrollStatus(payrollId);

      return jsonOk({ success: true, data: log }, 201);
    }

    // ── Create payroll ────────────────────────────────────────────────────
    if (!canCreatePayroll(user.role)) {
      return jsonError(
        "Only CEO, CFO, Admin, Accounting, or HR can create payroll records",
        403
      );
    }
    const {
      employeeId,
      month,
      year,
      basicPay,
      hra = 0,
      transport = 0,
      bonus = 0,
      deductions = 0,
      totalPay,
      notes,
      workingDays,
      presentDays,
      absentDays,
      leaveDays,
    } = body;

    if (!employeeId || !month || !year || basicPay === undefined) {
      return jsonError(
        "employeeId, month, year, and basicPay are required",
        400
      );
    }

    // Validate employee exists
    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) return jsonError("Employee not found", 404);

    // Validate month/year ranges
    if (month < 1 || month > 12) return jsonError("Month must be between 1 and 12", 400);
    if (year < 2000 || year > 2100) return jsonError("Year must be between 2000 and 2100", 400);
    if (basicPay < 0) return jsonError("Basic pay cannot be negative", 400);

    const calculatedTotal =
      totalPay !== undefined && totalPay !== null
        ? totalPay
        : basicPay + hra + transport + bonus - deductions;

    const payroll = await prisma.payroll.create({
      data: {
        employeeId,
        month,
        year,
        basicPay,
        hra,
        transport,
        bonus,
        deductions,
        totalPay: calculatedTotal,
        notes,
        workingDays: workingDays ?? 22,
        presentDays: presentDays ?? 0,
        absentDays: absentDays ?? 0,
        leaveDays: leaveDays ?? 0,
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

    return jsonOk({ success: true, data: payroll }, 201);
  } catch (error) {
    console.error("Payroll POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!canProcessPayroll(user.role)) {
      return jsonError(
        "Only CEO, CFO, Admin, or Accounting can update payroll records",
        403
      );
    }

    const body = await req.json();
    const { id, ...rawUpdates } = body;

    if (!id) return jsonError("Payroll id is required", 400);

    // Validate the payroll record exists
    const existing = await prisma.payroll.findUnique({ where: { id } });
    if (!existing) return jsonError("Payroll record not found", 404);

    // Whitelist allowed update fields to prevent arbitrary field injection
    const allowedFields = [
      "basicPay", "hra", "transport", "bonus", "deductions", "totalPay",
      "notes", "workingDays", "presentDays", "absentDays", "leaveDays",
      "status", "month", "year",
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (rawUpdates[key] !== undefined) {
        updates[key] = rawUpdates[key];
      }
    }

    // Validate status transition
    if (updates.status) {
      const validStatuses = ["PENDING", "PAID", "FAILED", "CANCELLED"];
      if (!validStatuses.includes(updates.status as string)) {
        return jsonError(`Invalid status. Must be one of: ${validStatuses.join(", ")}`, 400);
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

    return jsonOk({ success: true, data: payroll });
  } catch (error) {
    console.error("Payroll PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (user.role !== "CEO" && user.role !== "CFO" && user.role !== "ADMIN") {
      return jsonError("Only CEO, CFO, or Admin can delete payroll records", 403);
    }

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

      return jsonOk({
        success: true,
        message: "Payment log deleted successfully",
      });
    }

    // ── Delete a payroll (existing) ───────────────────────────────────────
    if (!id) return jsonError("Payroll id or logId is required", 400);

    // Delete associated logs first, then the payroll record
    await prisma.payrollLog.deleteMany({ where: { payrollId: id } });
    await prisma.payroll.delete({ where: { id } });

    return jsonOk({
      success: true,
      message: "Payroll record deleted successfully",
    });
  } catch (error) {
    console.error("Payroll DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
