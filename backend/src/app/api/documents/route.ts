import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

/* ─── GET  /api/documents?employeeId=xxx ──────────────────────────────────── */

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");

    const where: Record<string, unknown> = {};
    const canSeeAll = user.role === "CEO" || user.role === "ADMIN" || user.role === "HR";

    if (canSeeAll) {
      if (employeeId) where.employeeId = employeeId;
    } else {
      // Regular users can only see their own documents
      where.employeeId = user.id;
    }

    const documents = await prisma.employeeDocument.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, department: true },
        },
        verifier: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ success: true, data: documents, total: documents.length });
  } catch (error) {
    console.error("Documents GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

/* ─── POST  /api/documents ────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { employeeId, type, fileName, fileUrl, fileSize, notes, verifierId } = body;

    if (!type || !fileName) {
      return jsonError("type and fileName are required", 400);
    }

    // Regular users can only upload for themselves
    const targetEmployeeId = employeeId || user.id;
    const isHrOrAdmin = user.role === "HR" || user.role === "ADMIN";
    if (targetEmployeeId !== user.id && !isHrOrAdmin) {
      return jsonError("You can only upload documents for yourself", 403);
    }

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: targetEmployeeId,
        type,
        fileName,
        fileUrl: fileUrl || null,
        fileSize: fileSize || 0,
        notes: notes || null,
        verifierId: verifierId || null,
        status: verifierId ? "UNDER_REVIEW" : "PENDING",
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        verifier: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return jsonOk({ success: true, data: document }, 201);
  } catch (error) {
    console.error("Documents POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

/* ─── PATCH  /api/documents ───────────────────────────────────────────────── */

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { id, action, verifierId, rejectReason } = body;

    if (!id) return jsonError("Document id is required", 400);
    if (!action) return jsonError("action is required", 400);

    const doc = await prisma.employeeDocument.findUnique({ where: { id } });
    if (!doc) return jsonError("Document not found", 404);

    const isHrOrAdmin = user.role === "HR" || user.role === "ADMIN";
    const data: Record<string, unknown> = {};

    switch (action) {
      case "assignVerifier": {
        if (!isHrOrAdmin) return jsonError("Only HR or Admin can assign verifiers", 403);
        if (!verifierId) return jsonError("verifierId is required", 400);
        data.verifierId = verifierId;
        data.status = "UNDER_REVIEW";
        break;
      }

      case "verify": {
        if (!isHrOrAdmin) {
          return jsonError("Only HR or Admin can verify documents", 403);
        }
        data.status = "VERIFIED";
        data.verifiedAt = new Date();
        break;
      }

      case "reject": {
        if (!isHrOrAdmin) {
          return jsonError("Only HR or Admin can reject documents", 403);
        }
        if (!rejectReason) return jsonError("rejectReason is required", 400);
        data.status = "REJECTED";
        data.rejectedAt = new Date();
        data.rejectReason = rejectReason;
        break;
      }

      default:
        return jsonError("Invalid action. Must be assignVerifier, verify, or reject", 400);
    }

    const updated = await prisma.employeeDocument.update({
      where: { id },
      data,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        verifier: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Notify the document owner on verify or reject
    if (action === "verify") {
      createNotification(
        doc.employeeId,
        "DOCUMENT_VERIFIED",
        "Document verified",
        `Your document "${doc.fileName}" has been verified.`,
        `/documents`,
        { documentId: doc.id }
      ).catch(console.error);
    } else if (action === "reject") {
      createNotification(
        doc.employeeId,
        "DOCUMENT_VERIFIED",
        "Document rejected",
        `Your document "${doc.fileName}" has been rejected. Reason: ${rejectReason}`,
        `/documents`,
        { documentId: doc.id, rejectReason }
      ).catch(console.error);
    }

    return jsonOk({ success: true, data: updated });
  } catch (error) {
    console.error("Documents PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

/* ─── DELETE  /api/documents?id=xxx ───────────────────────────────────────── */

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return jsonError("Document id is required", 400);

    const doc = await prisma.employeeDocument.findUnique({ where: { id } });
    if (!doc) return jsonError("Document not found", 404);

    const isHrOrAdmin = user.role === "HR" || user.role === "ADMIN";

    if (isHrOrAdmin) {
      await prisma.employeeDocument.delete({ where: { id } });
      return jsonOk({ success: true, message: "Document deleted successfully" });
    }

    // Owner can delete only if still PENDING
    if (doc.employeeId !== user.id) {
      return jsonError("You can only delete your own documents", 403);
    }

    if (doc.status !== "PENDING") {
      return jsonError("Only pending documents can be deleted by the owner", 403);
    }

    await prisma.employeeDocument.delete({ where: { id } });
    return jsonOk({ success: true, message: "Document deleted successfully" });
  } catch (error) {
    console.error("Documents DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
