import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthFromHeaders } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

// ─── helpers ────────────────────────────────────────────────────────────────

const ESCALATION_ORDER: Array<"HR" | "PROJECT_MANAGER" | "CTO" | "CEO"> = [
  "HR",
  "PROJECT_MANAGER",
  "CTO",
  "CEO",
];

/** Map escalation level to the Prisma role that handles it. */
function levelToRole(level: string): string {
  switch (level) {
    case "HR":
      return "HR";
    case "PROJECT_MANAGER":
      return "PRODUCT_OWNER";
    case "CTO":
      return "CTO";
    case "CEO":
      return "CEO";
    default:
      return "HR";
  }
}

function ticketNumber(uuid: string): string {
  return "CMP-" + uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// ─── GET ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { userId, role } = auth;

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const escalationLevel = url.searchParams.get("escalationLevel") || undefined;
    const tab = url.searchParams.get("tab") || "mine"; // mine | assigned | all

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let where: any = {};

    if (tab === "mine") {
      where.filedById = userId;
    } else if (tab === "assigned") {
      where.assignedToId = userId;
    } else if (tab === "all") {
      // Role-based visibility for "all" tab
      if (role === "CEO" || role === "CTO" || role === "ADMIN") {
        // sees everything
      } else if (role === "HR") {
        where.OR = [
          { assignedToId: userId },
          { filedById: userId },
        ];
      } else {
        // Regular users can only see their own
        where.filedById = userId;
      }
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (escalationLevel) where.escalationLevel = escalationLevel;

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        filedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        against: { select: { id: true, firstName: true, lastName: true, role: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
        timeline: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ success: true, complaints });
  } catch (error) {
    console.error("Complaints GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── POST ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { userId, role } = auth;

    const body = await req.json();
    const { action } = body;

    // ── file ──────────────────────────────────────────────
    if (action === "file") {
      const { category, subject, description, againstId, isAnonymous } = body;
      if (!category || !subject || !description || !againstId) {
        return jsonError("Missing required fields: category, subject, description, againstId", 400);
      }

      // Cannot file against CEO
      const targetUser = await prisma.user.findUnique({
        where: { id: againstId },
        select: { role: true, firstName: true, lastName: true },
      });
      if (!targetUser) return jsonError("Target user not found", 404);
      if (targetUser.role === "CEO") {
        return jsonError("Cannot file complaint against CEO", 400);
      }
      // CTO (Darshankumar Joshi) is immune from complaints
      if (targetUser.role === "CTO") {
        return jsonError("Cannot file complaint against CTO", 400);
      }

      // Get filer info
      const filer = await prisma.user.findUnique({
        where: { id: userId },
        select: { workspaceId: true, firstName: true, lastName: true },
      });
      if (!filer) return jsonError("User not found", 404);

      // Auto-assign to an HR user in the same workspace
      const hrUser = await prisma.user.findFirst({
        where: { role: "HR", workspaceId: filer.workspaceId },
        select: { id: true },
      });

      const complaint = await prisma.complaint.create({
        data: {
          category,
          subject,
          description,
          filedById: userId,
          againstId,
          isAnonymous: isAnonymous ?? false,
          workspaceId: filer.workspaceId,
          assignedToId: hrUser?.id ?? null,
          status: "OPEN",
          escalationLevel: "HR",
          timeline: {
            create: {
              action: "FILED",
              note: `Complaint filed${isAnonymous ? " (anonymous)" : ""}: ${subject}`,
              actorId: userId,
            },
          },
        },
        include: {
          filedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          against: { select: { id: true, firstName: true, lastName: true, role: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          timeline: true,
        },
      });

      // Update ticket number to CMP-XXXX format
      const tn = ticketNumber(complaint.id);
      await prisma.complaint.update({
        where: { id: complaint.id },
        data: { ticketNumber: tn },
      });

      // Notifications
      const filerName = isAnonymous ? "Anonymous" : `${filer.firstName} ${filer.lastName}`;
      try {
        if (hrUser) {
          await createNotification(
            hrUser.id,
            "COMPLAINT_FILED",
            "New complaint assigned",
            `${filerName} filed complaint ${tn}: ${subject}`,
            `/complaints?highlight=${complaint.id}`
          );
        }
        // Notify the target (unless anonymous filing)
        if (!isAnonymous) {
          await createNotification(
            againstId,
            "COMPLAINT_FILED",
            "Complaint filed against you",
            `A complaint has been filed regarding: ${subject}`,
            `/complaints?highlight=${complaint.id}`
          );
        }
      } catch {
        // notifications are best-effort
      }

      return jsonOk({ success: true, complaint: { ...complaint, ticketNumber: tn } });
    }

    // ── escalate ──────────────────────────────────────────
    if (action === "escalate") {
      const { complaintId, note } = body;
      if (!complaintId) return jsonError("Missing complaintId", 400);

      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        include: {
          filedBy: { select: { id: true, firstName: true, lastName: true, workspaceId: true } },
        },
      });
      if (!complaint) return jsonError("Complaint not found", 404);

      // Only assignee or ADMIN can escalate
      if (complaint.assignedToId !== userId && role !== "ADMIN") {
        return jsonError("Only the assignee or admin can escalate", 403);
      }

      const currentIdx = ESCALATION_ORDER.indexOf(complaint.escalationLevel as typeof ESCALATION_ORDER[number]);
      if (currentIdx >= ESCALATION_ORDER.length - 1) {
        return jsonError("Already at highest escalation level (CEO)", 400);
      }

      const nextLevel = ESCALATION_ORDER[currentIdx + 1];
      const nextRole = levelToRole(nextLevel);

      // Find someone at the next level
      const nextAssignee = await prisma.user.findFirst({
        where: { role: nextRole as "HR" | "PRODUCT_OWNER" | "CTO" | "CEO", workspaceId: complaint.workspaceId },
        select: { id: true },
      });

      const updated = await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          escalationLevel: nextLevel,
          status: "ESCALATED",
          assignedToId: nextAssignee?.id ?? complaint.assignedToId,
          timeline: {
            create: {
              action: "ESCALATED",
              note: note || `Escalated from ${complaint.escalationLevel} to ${nextLevel}`,
              actorId: userId,
            },
          },
        },
        include: {
          filedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          against: { select: { id: true, firstName: true, lastName: true, role: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          timeline: { orderBy: { createdAt: "asc" } },
        },
      });

      // Notify new assignee & filer
      try {
        if (nextAssignee) {
          await createNotification(
            nextAssignee.id,
            "COMPLAINT_FILED",
            "Complaint escalated to you",
            `Complaint ${complaint.ticketNumber} has been escalated to ${nextLevel}`,
            `/complaints?highlight=${complaintId}`
          );
        }
        await createNotification(
          complaint.filedById,
          "COMPLAINT_FILED",
          "Complaint escalated",
          `Your complaint ${complaint.ticketNumber} has been escalated to ${nextLevel}`,
          `/complaints?highlight=${complaintId}`
        );
      } catch {
        // best-effort
      }

      return jsonOk({ success: true, complaint: updated });
    }

    // ── resolve ───────────────────────────────────────────
    if (action === "resolve") {
      const { complaintId, resolution } = body;
      if (!complaintId || !resolution) return jsonError("Missing complaintId or resolution", 400);

      const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
      if (!complaint) return jsonError("Complaint not found", 404);

      if (complaint.assignedToId !== userId && role !== "ADMIN") {
        return jsonError("Only the assignee or admin can resolve", 403);
      }

      const updated = await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status: "RESOLVED",
          resolution,
          timeline: {
            create: {
              action: "RESOLVED",
              note: `Resolved: ${resolution}`,
              actorId: userId,
            },
          },
        },
        include: {
          filedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          against: { select: { id: true, firstName: true, lastName: true, role: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          timeline: { orderBy: { createdAt: "asc" } },
        },
      });

      try {
        await createNotification(
          complaint.filedById,
          "COMPLAINT_RESOLVED",
          "Complaint resolved",
          `Your complaint ${complaint.ticketNumber} has been resolved`,
          `/complaints?highlight=${complaintId}`
        );
        await createNotification(
          complaint.againstId,
          "COMPLAINT_RESOLVED",
          "Complaint resolved",
          `Complaint ${complaint.ticketNumber} has been resolved`,
          `/complaints?highlight=${complaintId}`
        );
      } catch {
        // best-effort
      }

      return jsonOk({ success: true, complaint: updated });
    }

    // ── dismiss ───────────────────────────────────────────
    if (action === "dismiss") {
      const { complaintId, note } = body;
      if (!complaintId) return jsonError("Missing complaintId", 400);

      const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
      if (!complaint) return jsonError("Complaint not found", 404);

      if (complaint.assignedToId !== userId && role !== "ADMIN") {
        return jsonError("Only the assignee or admin can dismiss", 403);
      }

      const updated = await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status: "DISMISSED",
          timeline: {
            create: {
              action: "DISMISSED",
              note: note || "Complaint dismissed",
              actorId: userId,
            },
          },
        },
        include: {
          filedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          against: { select: { id: true, firstName: true, lastName: true, role: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          timeline: { orderBy: { createdAt: "asc" } },
        },
      });

      try {
        await createNotification(
          complaint.filedById,
          "COMPLAINT_RESOLVED",
          "Complaint dismissed",
          `Your complaint ${complaint.ticketNumber} has been dismissed`,
          `/complaints?highlight=${complaintId}`
        );
      } catch {
        // best-effort
      }

      return jsonOk({ success: true, complaint: updated });
    }

    // ── comment ───────────────────────────────────────────
    if (action === "comment") {
      const { complaintId, note } = body;
      if (!complaintId || !note) return jsonError("Missing complaintId or note", 400);

      const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
      if (!complaint) return jsonError("Complaint not found", 404);

      await prisma.complaintTimeline.create({
        data: {
          complaintId,
          action: "COMMENT",
          note,
          actorId: userId,
        },
      });

      // Update the complaint's updatedAt
      const updated = await prisma.complaint.update({
        where: { id: complaintId },
        data: { updatedAt: new Date() },
        include: {
          filedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
          against: { select: { id: true, firstName: true, lastName: true, role: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
          timeline: { orderBy: { createdAt: "asc" } },
        },
      });

      return jsonOk({ success: true, complaint: updated });
    }

    return jsonError("Invalid action. Use: file, escalate, resolve, dismiss, comment", 400);
  } catch (error) {
    console.error("Complaints POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── PATCH ──────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req);
    if (!auth) return jsonError("Unauthorized", 401);

    const { userId, role } = auth;

    const body = await req.json();
    const { complaintId, subject, description, category } = body;
    if (!complaintId) return jsonError("Missing complaintId", 400);

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return jsonError("Complaint not found", 404);

    // Only filer (if OPEN) or assignee can update
    const isFiler = complaint.filedById === userId && complaint.status === "OPEN";
    const isAssignee = complaint.assignedToId === userId;
    const isAdmin = role === "ADMIN";

    if (!isFiler && !isAssignee && !isAdmin) {
      return jsonError("Not authorized to update this complaint", 403);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (subject) data.subject = subject;
    if (description) data.description = description;
    if (category) data.category = category;

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        ...data,
        timeline: {
          create: {
            action: "UPDATED",
            note: "Complaint details updated",
            actorId: userId,
          },
        },
      },
      include: {
        filedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        against: { select: { id: true, firstName: true, lastName: true, role: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
        timeline: { orderBy: { createdAt: "asc" } },
      },
    });

    return jsonOk({ success: true, complaint: updated });
  } catch (error) {
    console.error("Complaints PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}
