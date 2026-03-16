import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { getPaginationParams } from "@/lib/pagination";

// ─── Role-specific notification type mapping ─────────────────────
// Defines which notification types each role is allowed to see,
// in addition to the universal types everyone receives.

const UNIVERSAL_TYPES = ["SYSTEM", "CHAT_MENTION"] as const;

const ROLE_NOTIFICATION_TYPES: Record<string, readonly string[]> = {
  // CEO: large transaction alerts, hiring approvals, revenue milestones
  CEO: ["LEAD_ASSIGNED", "LEAVE_APPROVED", "LEAVE_REJECTED", "TASK_COMPLETED", "DOCUMENT_VERIFIED"],
  // CTO mirrors CEO for technical oversight
  CTO: ["TASK_ASSIGNED", "TASK_COMPLETED", "TASK_OVERDUE", "TASK_COMMENT", "DOCUMENT_VERIFIED"],
  // CFO: financial-oriented
  CFO: ["LEAD_ASSIGNED", "DOCUMENT_VERIFIED", "TASK_COMPLETED"],
  // HR: leave requests, document submissions, complaint filings
  HR: ["LEAVE_APPROVED", "LEAVE_REJECTED", "DOCUMENT_VERIFIED", "COMPLAINT_FILED", "COMPLAINT_RESOLVED"],
  // ADMIN: sees everything
  ADMIN: [
    "TASK_ASSIGNED", "TASK_COMPLETED", "TASK_OVERDUE", "TASK_COMMENT",
    "LEAVE_APPROVED", "LEAVE_REJECTED", "DOCUMENT_VERIFIED",
    "LEAD_ASSIGNED", "COMPLAINT_FILED", "COMPLAINT_RESOLVED",
  ],
  // Developer roles: task assignments, project updates, code review requests
  SR_DEVELOPER: ["TASK_ASSIGNED", "TASK_COMPLETED", "TASK_OVERDUE", "TASK_COMMENT"],
  JR_DEVELOPER: ["TASK_ASSIGNED", "TASK_COMPLETED", "TASK_OVERDUE", "TASK_COMMENT"],
  // ACCOUNTING: financial
  ACCOUNTING: ["LEAD_ASSIGNED", "DOCUMENT_VERIFIED"],
  // Product & content roles
  PRODUCT_OWNER: ["TASK_ASSIGNED", "TASK_COMPLETED", "TASK_OVERDUE", "TASK_COMMENT", "LEAD_ASSIGNED"],
  CONTENT_STRATEGIST: ["TASK_ASSIGNED", "TASK_COMPLETED", "TASK_COMMENT"],
  EDITOR: ["TASK_ASSIGNED", "TASK_COMPLETED", "TASK_COMMENT"],
  GRAPHIC_DESIGNER: ["TASK_ASSIGNED", "TASK_COMPLETED", "TASK_COMMENT"],
  BRAND_FACE: ["TASK_ASSIGNED", "TASK_COMPLETED", "LEAD_ASSIGNED"],
  BRAND_PARTNER: ["TASK_ASSIGNED", "TASK_COMPLETED", "LEAD_ASSIGNED"],
  // General / support roles
  GUY: ["TASK_ASSIGNED", "TASK_COMPLETED"],
  OFFICE_BOY: ["TASK_ASSIGNED", "TASK_COMPLETED"],
};

/**
 * Returns the full set of notification types a given role is allowed to see.
 * Combines role-specific types with universal types that everyone receives.
 */
function getAllowedTypesForRole(role: string): string[] {
  const roleTypes = ROLE_NOTIFICATION_TYPES[role] ?? [];
  return [...new Set([...UNIVERSAL_TYPES, ...roleTypes])];
}

// ─── GET: List notifications ────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const { page = 1, pageSize = 50 } = getPaginationParams(searchParams, { pageSize: 50 });
    const readFilter = searchParams.get("read"); // "true" | "false" | null (all)
    const typeFilter = searchParams.get("type"); // comma-separated NotificationType values

    // Determine which notification types this user's role can see
    const allowedTypes = getAllowedTypesForRole(user.role);

    // Build where clause -- user only sees THEIR notifications
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      userId: user.id,
      type: { in: allowedTypes },
    };

    if (readFilter === "true") where.read = true;
    else if (readFilter === "false") where.read = false;

    // If client requests specific types, intersect with allowed types
    if (typeFilter) {
      const requestedTypes = typeFilter.split(",").map((t) => t.trim()).filter(Boolean);
      const intersected = requestedTypes.filter((t) => allowedTypes.includes(t));
      if (intersected.length > 0) {
        where.type = { in: intersected };
      } else {
        // None of the requested types are allowed for this role
        return jsonOk({
          success: true,
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
          unreadCount: 0,
        });
      }
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: user.id, read: false, type: { in: allowedTypes } },
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return jsonOk({
      success: true,
      data: notifications,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
      unreadCount,
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── PATCH: Mark notification(s) as read ────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();

    // Mark ALL as read
    if (body.action === "markAllRead") {
      const allowedTypes = getAllowedTypesForRole(user.role);
      const result = await prisma.notification.updateMany({
        where: { userId: user.id, read: false, type: { in: allowedTypes } },
        data: { read: true },
      });
      return jsonOk({ success: true, message: "All notifications marked as read", count: result.count });
    }

    // Bulk mark as read (array of ids)
    if (body.action === "markBulkRead" && Array.isArray(body.ids) && body.ids.length > 0) {
      const result = await prisma.notification.updateMany({
        where: { id: { in: body.ids }, userId: user.id },
        data: { read: true },
      });
      return jsonOk({ success: true, message: `${result.count} notifications marked as read`, count: result.count });
    }

    // Mark single as read
    const { id } = body;
    if (!id) return jsonError("Notification id is required", 400);

    const existing = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return jsonError("Notification not found", 404);

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return jsonOk({ success: true, data: notification });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── DELETE: Delete notification(s) ─────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json().catch(() => null);

    // Clear all read notifications
    if (body?.action === "clearAll") {
      const allowedTypes = getAllowedTypesForRole(user.role);
      const result = await prisma.notification.deleteMany({
        where: { userId: user.id, read: true, type: { in: allowedTypes } },
      });
      return jsonOk({ success: true, message: "All read notifications cleared", count: result.count });
    }

    // Bulk delete (array of ids)
    if (body?.action === "bulkDelete" && Array.isArray(body.ids) && body.ids.length > 0) {
      const result = await prisma.notification.deleteMany({
        where: { id: { in: body.ids }, userId: user.id },
      });
      return jsonOk({ success: true, message: `${result.count} notifications deleted`, count: result.count });
    }

    // Delete older than X days
    if (body?.action === "deleteOlderThan" && typeof body.days === "number") {
      const cutoff = new Date(Date.now() - body.days * 86400000);
      const result = await prisma.notification.deleteMany({
        where: { userId: user.id, createdAt: { lt: cutoff } },
      });
      return jsonOk({ success: true, message: `${result.count} old notifications deleted`, count: result.count });
    }

    // Delete single by id
    const id = body?.id;
    if (!id) return jsonError("Notification id is required", 400);

    const existing = await prisma.notification.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return jsonError("Notification not found", 404);

    await prisma.notification.delete({ where: { id } });
    return jsonOk({ success: true, message: "Notification deleted" });
  } catch (error) {
    console.error("Notifications DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
