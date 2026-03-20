import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { notifyLeaveDecision, createNotification } from "@/lib/notifications";

// ─── GET — List leave requests ─────────────────────────────────────────────
export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const employeeId = searchParams.get("employeeId");
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const where: Record<string, unknown> = {};

  // CEO / ADMIN / HR see all leaves; others see only their own
  const canSeeAll =
    user.role === "CEO" ||
    user.role === "ADMIN" ||
    user.role === "HR";

  if (canSeeAll) {
    if (employeeId) where.employeeId = employeeId;
  } else {
    where.employeeId = user.id;
  }

  if (status) where.status = status;

  // Filter by month/year — leaves that overlap the requested month
  if (month && year) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    where.startDate = { ...((where.startDate as object) || {}), lte: monthEnd };
    where.endDate = { ...((where.endDate as object) || {}), gte: monthStart };
  } else if (year) {
    const y = parseInt(year, 10);
    const yearStart = new Date(y, 0, 1);
    const yearEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    where.startDate = { ...((where.startDate as object) || {}), lte: yearEnd };
    where.endDate = { ...((where.endDate as object) || {}), gte: yearStart };
  }

  const leaves = await prisma.leaveRequest.findMany({
    where,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, department: true, avatar: true },
      },
      approver: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ success: true, data: leaves, total: leaves.length });
});

// ─── POST — Submit a new leave request ─────────────────────────────────────
export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const body = await req.json();
  const { type, startDate, endDate, reason } = body;

  if (!type || !startDate || !endDate || !reason) {
    return jsonError("type, startDate, endDate, and reason are required", 400);
  }

  const validTypes = ["PAID", "UNPAID", "SICK", "HALF_DAY", "WORK_FROM_HOME"];
  if (!validTypes.includes(type)) {
    return jsonError(`Invalid leave type. Must be one of: ${validTypes.join(", ")}`, 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return jsonError("Invalid date format", 400);
  }
  if (end < start) {
    return jsonError("endDate must be on or after startDate", 400);
  }

  // Check for overlapping approved/pending leave requests
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: user.id,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: end },
      endDate: { gte: start },
    },
  });

  if (overlapping) {
    return jsonError("You already have an overlapping leave request for these dates", 409);
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId: user.id,
      type,
      startDate: start,
      endDate: end,
      reason,
      status: "PENDING",
    },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, department: true, avatar: true },
      },
      approver: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Notify HR and Admin users about the new leave request
  const employeeName = `${leave.employee.firstName ?? ""} ${leave.employee.lastName ?? ""}`.trim();
  const hrUsers = await prisma.user.findMany({
    where: { workspaceId: user.workspaceId, role: { in: ["HR", "ADMIN"] }, id: { not: user.id } },
    select: { id: true },
  });
  for (const hr of hrUsers) {
    createNotification(
      hr.id,
      "SYSTEM",
      "New leave request",
      `${employeeName || user.email} has submitted a ${type} leave request.`,
      `/leaves?highlight=${leave.id}`,
      { leaveId: leave.id }
    ).catch(console.error);
  }

  return jsonOk({ success: true, data: leave }, 201);
});

// ─── PATCH — Approve or Reject a leave request ────────────────────────────
export const PATCH = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const canApprove =
    user.role === "HR" ||
    user.role === "ADMIN";

  if (!canApprove) {
    return jsonError("Only HR or Admin can approve/reject leaves", 403);
  }

  const body = await req.json();
  const { id, action, note } = body;

  if (!id) return jsonError("Leave request id is required", 400);
  if (!action || !["approve", "reject"].includes(action)) {
    return jsonError('action must be "approve" or "reject"', 400);
  }

  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave) return jsonError("Leave request not found", 404);

  if (leave.status !== "PENDING") {
    return jsonError(`Cannot ${action} a leave that is already ${leave.status}`, 400);
  }

  const data: Record<string, unknown> = {
    approverId: user.id,
    approverNote: note || null,
  };

  if (action === "approve") {
    data.status = "APPROVED";
    data.approvedAt = new Date();
  } else {
    data.status = "REJECTED";
    data.rejectedAt = new Date();
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, department: true, avatar: true },
      },
      approver: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Notify the employee about the leave decision
  notifyLeaveDecision(id, leave.employeeId, action === "approve").catch(console.error);

  return jsonOk({ success: true, data: updated });
});

// ─── DELETE — Cancel own pending leave request ─────────────────────────────
export const DELETE = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return jsonError("Leave request id is required", 400);

  const leave = await prisma.leaveRequest.findUnique({ where: { id } });
  if (!leave) return jsonError("Leave request not found", 404);

  if (leave.employeeId !== user.id && user.role !== "ADMIN") {
    return jsonError("You can only cancel your own leave requests", 403);
  }

  if (leave.status !== "PENDING") {
    return jsonError("Only pending leave requests can be cancelled", 400);
  }

  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, department: true, avatar: true },
      },
      approver: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return jsonOk({ success: true, data: updated, message: "Leave request cancelled" });
});
