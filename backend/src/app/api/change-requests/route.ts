import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// Role hierarchy for chat/change request permissions
const ROLE_LEVEL: Record<string, number> = {
  CTO: 100, CEO: 98, CFO: 90, BRAND_FACE: 85,
  ADMIN: 80, HR: 75, PRODUCT_OWNER: 70, BRAND_PARTNER: 65,
  SR_ACCOUNTANT: 50, SR_DEVELOPER: 50, SR_GRAPHIC_DESIGNER: 50, SR_EDITOR: 50,
  SR_CONTENT_STRATEGIST: 50, SR_SCRIPT_WRITER: 50, SR_BRAND_STRATEGIST: 50,
  JR_ACCOUNTANT: 30, JR_DEVELOPER: 30, JR_GRAPHIC_DESIGNER: 30, JR_EDITOR: 30,
  JR_CONTENT_STRATEGIST: 30, JR_SCRIPT_WRITER: 30, JR_BRAND_STRATEGIST: 30,
  DRIVER: 20, GUY: 15, OFFICE_BOY: 10,
};

export function getRoleLevel(role: string): number {
  return ROLE_LEVEL[role] || 0;
}

// GET: List change requests
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    // HR sees PENDING_HR requests + all they've handled
    // CTO sees PENDING_CTO requests + all they've handled
    // CEO/ADMIN see all
    // Others see only their own
    if (["CEO", "ADMIN"].includes(user.role)) {
      // see all
    } else if (user.role === "CTO") {
      where.OR = [
        { status: "PENDING_CTO" },
        { ctoApproval: user.id },
        { requesterId: user.id },
      ];
    } else if (user.role === "HR") {
      where.OR = [
        { status: "PENDING_HR" },
        { hrApproval: user.id },
        { requesterId: user.id },
      ];
    } else {
      where.requesterId = user.id;
    }

    if (status) where.status = status;

    const requests = await prisma.changeRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Fetch requester names
    const userIds = [...new Set(requests.map(r => r.requesterId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const enriched = requests.map(r => ({
      ...r,
      requester: userMap[r.requesterId] || null,
    }));

    return jsonOk(enriched);
  } catch (error) {
    console.error("ChangeRequest GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// POST: Create or process change request
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { action } = body;

    // ── Submit a new change request ──
    if (!action || action === "submit") {
      const { fieldName, requestedValue, reason } = body;
      if (!fieldName || !requestedValue) {
        return jsonError("fieldName and requestedValue are required", 400);
      }

      const allowedFields = ["email", "companyEmail", "firstName", "lastName"];
      if (!allowedFields.includes(fieldName)) {
        return jsonError(`Cannot request change for field: ${fieldName}`, 400);
      }

      // Get current value
      const currentValue = (user as Record<string, unknown>)[fieldName] as string || "";

      // Check for duplicate pending request
      const existing = await prisma.changeRequest.findFirst({
        where: {
          requesterId: user.id,
          fieldName,
          status: { in: ["PENDING_HR", "PENDING_CTO"] },
        },
      });
      if (existing) {
        return jsonError("You already have a pending change request for this field", 400);
      }

      const request = await prisma.changeRequest.create({
        data: {
          requesterId: user.id,
          fieldName,
          currentValue,
          requestedValue,
          reason: reason || null,
          status: "PENDING_HR",
        },
      });

      // Notify HR
      const hrUsers = await prisma.user.findMany({
        where: { role: "HR" },
        select: { id: true },
      });
      for (const hr of hrUsers) {
        await prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: "Change Request Submitted",
            message: `${user.firstName} ${user.lastName} requested to change their ${fieldName} from "${currentValue}" to "${requestedValue}"`,
            userId: hr.id,
            linkUrl: "/settings",
          },
        });
      }

      return jsonOk(request, 201);
    }

    // ── HR approves/rejects ──
    if (action === "hr_approve" || action === "hr_reject") {
      if (!["HR", "ADMIN", "CEO"].includes(user.role)) {
        return jsonError("Only HR can process this request", 403);
      }

      const { id, note } = body;
      if (!id) return jsonError("Request id required", 400);

      const request = await prisma.changeRequest.findUnique({ where: { id } });
      if (!request) return jsonError("Request not found", 404);
      if (request.status !== "PENDING_HR") return jsonError("Request is not pending HR approval", 400);

      if (action === "hr_reject") {
        const updated = await prisma.changeRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            hrApproval: user.id,
            hrApprovalAt: new Date(),
            hrNote: note || "Rejected by HR",
          },
        });

        // Notify requester
        await prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: "Change Request Rejected",
            message: `Your request to change ${request.fieldName} was rejected by HR. ${note || ""}`,
            userId: request.requesterId,
            linkUrl: "/settings",
          },
        });

        return jsonOk(updated);
      }

      // HR approves → escalate to CTO
      const updated = await prisma.changeRequest.update({
        where: { id },
        data: {
          status: "PENDING_CTO",
          hrApproval: user.id,
          hrApprovalAt: new Date(),
          hrNote: note || "Approved by HR",
        },
      });

      // Notify CTO
      const ctoUser = await prisma.user.findFirst({ where: { role: "CTO" } });
      if (ctoUser) {
        await prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: "Change Request Needs CTO Approval",
            message: `HR approved ${request.fieldName} change request. Needs your final approval.`,
            userId: ctoUser.id,
            linkUrl: "/settings",
          },
        });
      }

      return jsonOk(updated);
    }

    // ── CTO approves/rejects ──
    if (action === "cto_approve" || action === "cto_reject") {
      if (!["CTO", "CEO", "ADMIN"].includes(user.role)) {
        return jsonError("Only CTO can process this request", 403);
      }

      const { id, note } = body;
      if (!id) return jsonError("Request id required", 400);

      const request = await prisma.changeRequest.findUnique({ where: { id } });
      if (!request) return jsonError("Request not found", 404);
      if (request.status !== "PENDING_CTO") return jsonError("Request is not pending CTO approval", 400);

      if (action === "cto_reject") {
        const updated = await prisma.changeRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            ctoApproval: user.id,
            ctoApprovalAt: new Date(),
            ctoNote: note || "Rejected by CTO",
          },
        });

        await prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: "Change Request Rejected by CTO",
            message: `Your request to change ${request.fieldName} was rejected by CTO. ${note || ""}`,
            userId: request.requesterId,
            linkUrl: "/settings",
          },
        });

        return jsonOk(updated);
      }

      // CTO approves → apply the change
      const updateData: Record<string, string> = {};
      updateData[request.fieldName] = request.requestedValue;

      await prisma.user.update({
        where: { id: request.requesterId },
        data: updateData,
      });

      const updated = await prisma.changeRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          ctoApproval: user.id,
          ctoApprovalAt: new Date(),
          ctoNote: note || "Approved by CTO",
          appliedAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          type: "SYSTEM",
          title: "Change Request Approved!",
          message: `Your ${request.fieldName} has been changed to "${request.requestedValue}"`,
          userId: request.requesterId,
          linkUrl: "/settings",
        },
      });

      return jsonOk(updated);
    }

    return jsonError("Invalid action", 400);
  } catch (error) {
    console.error("ChangeRequest POST error:", error);
    return jsonError("Internal server error", 500);
  }
}
