import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

const HR_ROLES = ["CTO", "CEO", "ADMIN", "HR"];
const MANAGER_ROLES = ["CTO", "CEO", "ADMIN", "PRODUCT_OWNER", "BRAND_FACE", "CFO"];

// GET: List requests
export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  const where: Record<string, unknown> = {};

  // HR/Admin see all, managers see PENDING_MANAGER, others see own
  if (HR_ROLES.includes(user.role)) {
    // See all
  } else if (MANAGER_ROLES.includes(user.role)) {
    where.OR = [
      { status: "PENDING_MANAGER" },
      { managerReviewerId: user.id },
      { requesterId: user.id },
    ];
  } else {
    where.requesterId = user.id;
  }

  if (status) where.status = status;
  if (type) where.type = type;

  const requests = await prisma.resourceRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  // Enrich with requester names
  const userIds = [...new Set(requests.map(r => r.requesterId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, firstName: true, lastName: true, role: true, department: true, avatar: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  // Enrich with project names
  const projectIds = requests.map(r => r.projectId).filter(Boolean) as string[];
  const projects = projectIds.length > 0 ? await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true },
  }) : [];
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));

  const enriched = requests.map(r => ({
    ...r,
    requester: userMap[r.requesterId] || null,
    project: r.projectId ? projectMap[r.projectId] || null : null,
  }));

  // Stats
  const stats = {
    total: requests.length,
    pendingHR: requests.filter(r => r.status === "PENDING_HR").length,
    pendingManager: requests.filter(r => r.status === "PENDING_MANAGER").length,
    approved: requests.filter(r => r.status === "APPROVED").length,
    provisioned: requests.filter(r => r.status === "PROVISIONED").length,
  };

  return jsonOk({ requests: enriched, stats });
});

// POST: Create or process request
export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const body = await req.json();
  const { action } = body;

  // ── Submit new request ──
  if (!action || action === "submit") {
    const { type, title, purpose, url, cost, currency, projectId, priority } = body;

    if (!type || !title || !purpose) {
      return jsonError("type, title, and purpose are required", 400);
    }

    const request = await prisma.resourceRequest.create({
      data: {
        requesterId: user.id,
        type,
        title,
        purpose,
        url: url || null,
        cost: cost ? parseFloat(cost) : null,
        currency: currency || "INR",
        projectId: projectId || null,
        priority: priority || "MEDIUM",
        status: "PENDING_HR",
      },
    });

    // Notify HR
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ["HR", "ADMIN"] } },
      select: { id: true },
    });
    for (const hr of hrUsers) {
      await prisma.notification.create({
        data: {
          type: "SYSTEM",
          title: "New Resource Request",
          message: `${user.firstName} ${user.lastName} requested ${type.toLowerCase().replace("_", " ")}: "${title}"${cost ? ` (${currency} ${cost})` : ""}`,
          userId: hr.id,
          linkUrl: "/requests",
        },
      }).catch(() => {});
    }

    return jsonOk(request, 201);
  }

  // ── HR approves → escalate to manager ──
  if (action === "hr_approve") {
    if (!HR_ROLES.includes(user.role)) return jsonError("Only HR can approve", 403);

    const { id, note } = body;
    const request = await prisma.resourceRequest.findUnique({ where: { id } });
    if (!request) return jsonError("Request not found", 404);
    if (request.status !== "PENDING_HR") return jsonError("Not pending HR review", 400);

    const updated = await prisma.resourceRequest.update({
      where: { id },
      data: {
        status: "PENDING_MANAGER",
        hrReviewerId: user.id,
        hrReviewedAt: new Date(),
        hrNote: note || "Approved by HR",
      },
    });

    // Notify CTO/managers
    const managers = await prisma.user.findMany({
      where: { role: { in: ["CTO", "CEO", "PRODUCT_OWNER"] } },
      select: { id: true },
    });
    for (const mgr of managers) {
      await prisma.notification.create({
        data: {
          type: "SYSTEM",
          title: "Resource Request Needs Approval",
          message: `HR approved "${request.title}" request. Needs your approval.`,
          userId: mgr.id,
          linkUrl: "/requests",
        },
      }).catch(() => {});
    }

    // Notify requester
    await prisma.notification.create({
      data: {
        type: "SYSTEM",
        title: "Request Approved by HR",
        message: `Your request "${request.title}" was approved by HR and sent for final approval.`,
        userId: request.requesterId,
        linkUrl: "/requests",
      },
    }).catch(() => {});

    return jsonOk(updated);
  }

  // ── HR rejects ──
  if (action === "hr_reject") {
    if (!HR_ROLES.includes(user.role)) return jsonError("Only HR can reject", 403);

    const { id, note } = body;
    const request = await prisma.resourceRequest.findUnique({ where: { id } });
    if (!request) return jsonError("Request not found", 404);

    const updated = await prisma.resourceRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        hrReviewerId: user.id,
        hrReviewedAt: new Date(),
        hrNote: note || "Rejected by HR",
      },
    });

    await prisma.notification.create({
      data: {
        type: "SYSTEM",
        title: "Request Rejected",
        message: `Your request "${request.title}" was rejected. ${note || ""}`,
        userId: request.requesterId,
        linkUrl: "/requests",
      },
    }).catch(() => {});

    return jsonOk(updated);
  }

  // ── Manager approves ──
  if (action === "manager_approve") {
    if (!MANAGER_ROLES.includes(user.role)) return jsonError("Insufficient permissions", 403);

    const { id, note } = body;
    const request = await prisma.resourceRequest.findUnique({ where: { id } });
    if (!request) return jsonError("Request not found", 404);
    if (request.status !== "PENDING_MANAGER") return jsonError("Not pending manager approval", 400);

    const updated = await prisma.resourceRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        managerReviewerId: user.id,
        managerReviewedAt: new Date(),
        managerNote: note || "Approved",
      },
    });

    // Notify HR to provision
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ["HR", "ADMIN"] } },
      select: { id: true },
    });
    for (const hr of hrUsers) {
      await prisma.notification.create({
        data: {
          type: "SYSTEM",
          title: "Request Approved - Please Provision",
          message: `"${request.title}" approved by ${user.firstName}. Please provision access.`,
          userId: hr.id,
          linkUrl: "/requests",
        },
      }).catch(() => {});
    }

    // Notify requester
    await prisma.notification.create({
      data: {
        type: "SYSTEM",
        title: "Request Approved!",
        message: `Your request "${request.title}" has been approved. HR will provision access shortly.`,
        userId: request.requesterId,
        linkUrl: "/requests",
      },
    }).catch(() => {});

    return jsonOk(updated);
  }

  // ── Manager rejects ──
  if (action === "manager_reject") {
    if (!MANAGER_ROLES.includes(user.role)) return jsonError("Insufficient permissions", 403);

    const { id, note } = body;
    const request = await prisma.resourceRequest.findUnique({ where: { id } });
    if (!request) return jsonError("Request not found", 404);

    const updated = await prisma.resourceRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        managerReviewerId: user.id,
        managerReviewedAt: new Date(),
        managerNote: note || "Rejected by manager",
      },
    });

    await prisma.notification.create({
      data: {
        type: "SYSTEM",
        title: "Request Rejected by Manager",
        message: `Your request "${request.title}" was rejected. ${note || ""}`,
        userId: request.requesterId,
        linkUrl: "/requests",
      },
    }).catch(() => {});

    return jsonOk(updated);
  }

  // ── HR provisions (after approval) ──
  if (action === "provision") {
    if (!HR_ROLES.includes(user.role)) return jsonError("Only HR can provision", 403);

    const { id, note, credentialId } = body;
    const request = await prisma.resourceRequest.findUnique({ where: { id } });
    if (!request) return jsonError("Request not found", 404);
    if (request.status !== "APPROVED") return jsonError("Request not yet approved", 400);

    const updated = await prisma.resourceRequest.update({
      where: { id },
      data: {
        status: "PROVISIONED",
        provisionedAt: new Date(),
        provisionedBy: user.id,
        provisionNote: note || "Access provisioned",
        credentialId: credentialId || null,
      },
    });

    await prisma.notification.create({
      data: {
        type: "SYSTEM",
        title: "Access Provisioned!",
        message: `Your request "${request.title}" has been provisioned. ${credentialId ? "Check Password Manager for credentials." : ""}`,
        userId: request.requesterId,
        linkUrl: credentialId ? "/passwords" : "/requests",
      },
    }).catch(() => {});

    return jsonOk(updated);
  }

  return jsonError("Invalid action", 400);
});
