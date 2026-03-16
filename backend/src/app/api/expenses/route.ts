import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// ─── Role Sets ───────────────────────────────────────────────────────────────

/** Full visibility + approve all */
const EXPENSE_FULL_ACCESS = ["CEO", "CFO", "ADMIN"] as const;

/** See all + approve up to limit */
const EXPENSE_ACCOUNTING = "ACCOUNTING";

/** Approve team expenses only */
const EXPENSE_TEAM_APPROVERS = ["HR", "PRODUCT_OWNER"] as const;

function canSeeAllExpenses(role: string) {
  return (
    (EXPENSE_FULL_ACCESS as readonly string[]).includes(role) ||
    role === EXPENSE_ACCOUNTING
  );
}

function canApproveAll(role: string) {
  return (EXPENSE_FULL_ACCESS as readonly string[]).includes(role);
}

function isTeamApprover(role: string) {
  return (EXPENSE_TEAM_APPROVERS as readonly string[]).includes(role);
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const submitterId = searchParams.get("submitterId");

    const where: Record<string, unknown> = {
      // Workspace isolation: only show expenses from users in the same workspace
      submitter: { workspaceId: user.workspaceId },
    };

    if (canSeeAllExpenses(user.role)) {
      // CEO, CFO, ADMIN, ACCOUNTING — see all expenses in workspace
      if (submitterId) where.submitterId = submitterId;
    } else if (isTeamApprover(user.role)) {
      // HR, PRODUCT_OWNER — see own expenses + team (same department) expenses
      if (submitterId) {
        where.submitterId = submitterId;
      } else {
        where.OR = [
          { submitterId: user.id },
          ...(user.department
            ? [{ submitter: { workspaceId: user.workspaceId, department: user.department } }]
            : []),
        ];
      }
    } else {
      // Everyone else — own expenses only
      where.submitterId = user.id;
    }

    if (status) where.status = status;
    if (category) where.category = category;

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        submitter: {
          select: { id: true, firstName: true, lastName: true, department: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ success: true, data: expenses, total: expenses.length });
  } catch (error) {
    console.error("Expenses GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { title, description, amount, category, receipt, expenseDate } = body;

    if (!title || amount === undefined || !category) {
      return jsonError("title, amount, and category are required", 400);
    }

    if (typeof amount !== "number" || isNaN(amount) || amount <= 0) {
      return jsonError("amount must be a positive number", 400);
    }

    if (typeof title !== "string" || !title.trim()) {
      return jsonError("title must be a non-empty string", 400);
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        description,
        amount,
        category,
        receipt,
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        submitterId: user.id,
        status: "SUBMITTED",
      },
      include: {
        submitter: {
          select: { id: true, firstName: true, lastName: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return jsonOk({ success: true, data: expense }, 201);
  } catch (error) {
    console.error("Expenses POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

/** Accounting approval limit (in currency units) */
const ACCOUNTING_APPROVAL_LIMIT = 50_000;

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { id, status, rejectNote, ...fields } = body;

    if (!id) return jsonError("Expense id is required", 400);

    const expense = await prisma.expense.findFirst({
      where: { id, submitter: { workspaceId: user.workspaceId } },
      include: {
        submitter: { select: { id: true, department: true } },
      },
    });
    if (!expense) return jsonError("Expense not found", 404);

    const data: Record<string, unknown> = {};

    // Determine approval authority
    const hasFullApproval = canApproveAll(user.role);
    const hasAccountingApproval = user.role === EXPENSE_ACCOUNTING;
    const hasTeamApproval = isTeamApprover(user.role);

    // Check if this is a team expense (same department)
    const isSameDepartment =
      user.department &&
      expense.submitter.department &&
      user.department === expense.submitter.department;

    if (status === "APPROVED") {
      if (hasFullApproval) {
        // CEO, CFO, ADMIN — approve any amount
        data.status = "APPROVED";
        data.approverId = user.id;
        data.approvedAt = new Date();
      } else if (hasAccountingApproval) {
        // ACCOUNTING — approve up to limit
        if (expense.amount > ACCOUNTING_APPROVAL_LIMIT) {
          return jsonError(
            `Accounting can only approve expenses up to ${ACCOUNTING_APPROVAL_LIMIT}. This expense requires CEO, CFO, or Admin approval.`,
            403
          );
        }
        data.status = "APPROVED";
        data.approverId = user.id;
        data.approvedAt = new Date();
      } else if (hasTeamApproval && isSameDepartment) {
        // HR, PRODUCT_OWNER — approve team (same department) expenses
        data.status = "APPROVED";
        data.approverId = user.id;
        data.approvedAt = new Date();
      } else {
        return jsonError(
          "You do not have permission to approve this expense",
          403
        );
      }
    } else if (status === "REJECTED") {
      if (
        !hasFullApproval &&
        !hasAccountingApproval &&
        !(hasTeamApproval && isSameDepartment)
      ) {
        return jsonError(
          "You do not have permission to reject this expense",
          403
        );
      }
      data.status = "REJECTED";
      data.approverId = user.id;
      data.rejectedAt = new Date();
      if (rejectNote) data.rejectNote = rejectNote;
    } else if (status === "REIMBURSED") {
      if (!hasFullApproval && !hasAccountingApproval) {
        return jsonError(
          "Only CEO, CFO, Admin, or Accounting can mark expenses as reimbursed",
          403
        );
      }
      data.status = "REIMBURSED";
    } else if (status) {
      // Other status changes — only full-access roles
      if (!hasFullApproval) {
        return jsonError("Insufficient permissions for this status change", 403);
      }
      data.status = status;
    }

    // Field edits
    const isPrivileged = hasFullApproval || hasAccountingApproval || hasTeamApproval;

    if (!status && expense.submitter.id === user.id && expense.status === "DRAFT") {
      // Submitter can update own DRAFT expenses
      if (fields.title) data.title = fields.title;
      if (fields.description !== undefined) data.description = fields.description;
      if (fields.amount !== undefined) data.amount = fields.amount;
      if (fields.category) data.category = fields.category;
      if (fields.receipt !== undefined) data.receipt = fields.receipt;
      if (fields.expenseDate) data.expenseDate = new Date(fields.expenseDate);
    } else if (!status && expense.submitter.id !== user.id && !isPrivileged) {
      return jsonError("You can only update your own draft expenses", 403);
    } else if (!status && expense.status !== "DRAFT" && !isPrivileged) {
      return jsonError("Only draft expenses can be edited", 403);
    } else if (!status && isPrivileged) {
      // Privileged roles can update fields
      if (fields.title) data.title = fields.title;
      if (fields.description !== undefined) data.description = fields.description;
      if (fields.amount !== undefined) data.amount = fields.amount;
      if (fields.category) data.category = fields.category;
      if (fields.receipt !== undefined) data.receipt = fields.receipt;
      if (fields.expenseDate) data.expenseDate = new Date(fields.expenseDate);
    }

    const updated = await prisma.expense.update({
      where: { id },
      data,
      include: {
        submitter: {
          select: { id: true, firstName: true, lastName: true, department: true },
        },
        approver: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return jsonOk({ success: true, data: updated });
  } catch (error) {
    console.error("Expenses PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return jsonError("Expense id is required", 400);

    const expense = await prisma.expense.findFirst({
      where: { id, submitter: { workspaceId: user.workspaceId } },
    });
    if (!expense) return jsonError("Expense not found", 404);

    // CEO, CFO, ADMIN can delete any expense; others can only delete own DRAFT
    if (canApproveAll(user.role)) {
      await prisma.expense.delete({ where: { id } });
      return jsonOk({ success: true, message: "Expense deleted successfully" });
    }

    if (expense.submitterId !== user.id) {
      return jsonError("You can only delete your own expenses", 403);
    }

    if (expense.status !== "DRAFT") {
      return jsonError("Only draft expenses can be deleted", 403);
    }

    await prisma.expense.delete({ where: { id } });

    return jsonOk({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    console.error("Expenses DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
