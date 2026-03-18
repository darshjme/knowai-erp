import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

const HR_ROLES = ["CTO", "CEO", "ADMIN", "HR"];

// GET: List documents for current user or all (HR)
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return jsonError("Authentication required", 401);
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const pending = searchParams.get("pending");

    const isHR = HR_ROLES.includes(authUser.role);

    // HR: get specific user's documents
    if (userId) {
      if (!isHR) {
        return jsonError("Only HR can view other users' documents", 403);
      }
      const documents = await prisma.identityDocument.findMany({
        where: { userId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: "desc" },
      });
      return jsonOk({ success: true, data: documents });
    }

    // HR: get all pending documents
    if (pending === "true") {
      if (!isHR) {
        return jsonError("Only HR can view pending documents", 403);
      }
      const documents = await prisma.identityDocument.findMany({
        where: { status: "PENDING" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
          reviewer: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: "desc" },
      });
      return jsonOk({ success: true, data: documents });
    }

    // Default: get current user's documents
    const documents = await prisma.identityDocument.findMany({
      where: { userId: authUser.id },
      include: {
        reviewer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return jsonOk({ success: true, data: documents });
  } catch (error) {
    console.error("Document verification GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// POST: Submit, approve, reject, or request resubmission of documents
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return jsonError("Authentication required", 401);
    }

    const body = await req.json();
    const { action } = body;

    if (!action) {
      return jsonError("Action is required", 400);
    }

    const isHR = HR_ROLES.includes(authUser.role);

    // ── Submit a new identity document ──
    if (action === "submit") {
      const { docType, fileName, fileUrl, fileSize } = body;

      if (!docType || !fileName || !fileUrl) {
        return jsonError("docType, fileName, and fileUrl are required", 400);
      }

      const document = await prisma.identityDocument.create({
        data: {
          userId: authUser.id,
          docType,
          fileName,
          fileUrl,
          fileSize: fileSize ? parseInt(fileSize, 10) : null,
          status: "PENDING",
        },
      });

      // Notify all HR users about the new document submission
      const hrUsers = await prisma.user.findMany({
        where: {
          role: { in: ["CTO", "CEO", "ADMIN", "HR"] },
          workspaceId: authUser.workspaceId,
        },
      });

      for (const hr of hrUsers) {
        await prisma.notification.create({
          data: {
            type: "DOCUMENT_VERIFIED",
            title: "New Document Submitted for Verification",
            message: `${authUser.firstName} ${authUser.lastName} submitted a ${docType.replace("_", " ")} for verification.`,
            userId: hr.id,
            linkUrl: "/document-verification",
          },
        }).catch(() => {});
      }

      return jsonOk({
        success: true,
        message: "Document submitted for verification",
        data: document,
      });
    }

    // ── Approve a document ──
    if (action === "approve") {
      if (!isHR) {
        return jsonError("Only HR can approve documents", 403);
      }

      const { documentId, note } = body;
      if (!documentId) {
        return jsonError("documentId is required", 400);
      }

      const document = await prisma.identityDocument.findUnique({
        where: { id: documentId },
        include: { user: true },
      });

      if (!document) {
        return jsonError("Document not found", 404);
      }

      if (document.status === "APPROVED") {
        return jsonError("Document is already approved", 400);
      }

      const updated = await prisma.identityDocument.update({
        where: { id: documentId },
        data: {
          status: "APPROVED",
          reviewerId: authUser.id,
          reviewedAt: new Date(),
          reviewNote: note || null,
        },
      });

      // Notify the document owner
      await prisma.notification.create({
        data: {
          type: "DOCUMENT_VERIFIED",
          title: "Document Verified",
          message: `Your ${document.docType.replace("_", " ")} has been verified.`,
          userId: document.userId,
          linkUrl: "/document-verification",
        },
      }).catch(() => {});

      // Check if user has all required docs approved (at least 1 ID + PAN card)
      const allDocs = await prisma.identityDocument.findMany({
        where: { userId: document.userId, status: "APPROVED" },
      });

      const hasIdDoc = allDocs.some((d) =>
        ["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE", "AADHAAR"].includes(d.docType)
      );
      const hasPanCard = allDocs.some((d) => d.docType === "PAN_CARD");

      if (hasIdDoc && hasPanCard) {
        await prisma.user.update({
          where: { id: document.userId },
          data: {
            verified: true,
            verifiedAt: new Date(),
            verifiedBy: authUser.id,
          },
        });

        await prisma.notification.create({
          data: {
            type: "DOCUMENT_VERIFIED",
            title: "Identity Fully Verified",
            message: "Your identity has been fully verified!",
            userId: document.userId,
            linkUrl: "/document-verification",
          },
        }).catch(() => {});
      }

      return jsonOk({
        success: true,
        message: "Document approved",
        data: updated,
      });
    }

    // ── Reject a document ──
    if (action === "reject") {
      if (!isHR) {
        return jsonError("Only HR can reject documents", 403);
      }

      const { documentId, note } = body;
      if (!documentId) {
        return jsonError("documentId is required", 400);
      }

      const document = await prisma.identityDocument.findUnique({
        where: { id: documentId },
        include: { user: true },
      });

      if (!document) {
        return jsonError("Document not found", 404);
      }

      const updated = await prisma.identityDocument.update({
        where: { id: documentId },
        data: {
          status: "REJECTED",
          reviewerId: authUser.id,
          reviewedAt: new Date(),
          reviewNote: note || null,
        },
      });

      await prisma.notification.create({
        data: {
          type: "DOCUMENT_VERIFIED",
          title: "Document Rejected",
          message: `Your ${document.docType.replace("_", " ")} was rejected: ${note || "No reason provided"}. Please resubmit.`,
          userId: document.userId,
          linkUrl: "/document-verification",
        },
      }).catch(() => {});

      return jsonOk({
        success: true,
        message: "Document rejected",
        data: updated,
      });
    }

    // ── Request resubmission ──
    if (action === "requestResubmit") {
      if (!isHR) {
        return jsonError("Only HR can request resubmission", 403);
      }

      const { documentId, note } = body;
      if (!documentId) {
        return jsonError("documentId is required", 400);
      }

      const document = await prisma.identityDocument.findUnique({
        where: { id: documentId },
        include: { user: true },
      });

      if (!document) {
        return jsonError("Document not found", 404);
      }

      const updated = await prisma.identityDocument.update({
        where: { id: documentId },
        data: {
          status: "RESUBMIT",
          reviewerId: authUser.id,
          reviewedAt: new Date(),
          reviewNote: note || null,
        },
      });

      await prisma.notification.create({
        data: {
          type: "DOCUMENT_VERIFIED",
          title: "Document Resubmission Requested",
          message: `Your ${document.docType.replace("_", " ")} needs to be resubmitted: ${note || "Please check and resubmit."}`,
          userId: document.userId,
          linkUrl: "/document-verification",
        },
      }).catch(() => {});

      return jsonOk({
        success: true,
        message: "Resubmission requested",
        data: updated,
      });
    }

    return jsonError("Invalid action. Use: submit, approve, reject, requestResubmit", 400);
  } catch (error) {
    console.error("Document verification POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// DELETE: Delete own pending document
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return jsonError("Authentication required", 401);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonError("Document id is required", 400);
    }

    const document = await prisma.identityDocument.findUnique({
      where: { id },
    });

    if (!document) {
      return jsonError("Document not found", 404);
    }

    if (document.userId !== authUser.id) {
      return jsonError("You can only delete your own documents", 403);
    }

    if (document.status !== "PENDING") {
      return jsonError("Only pending documents can be deleted", 400);
    }

    await prisma.identityDocument.delete({
      where: { id },
    });

    return jsonOk({
      success: true,
      message: "Document deleted",
    });
  } catch (error) {
    console.error("Document verification DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
