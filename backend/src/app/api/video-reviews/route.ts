import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { createNotification } from "@/lib/notifications";

// Roles that can upload videos (editors, content strategists, designers + senior/management)
const UPLOAD_ROLES = [
  "SR_EDITOR",
  "JR_EDITOR",
  "SR_CONTENT_STRATEGIST",
  "JR_CONTENT_STRATEGIST",
  "SR_GRAPHIC_DESIGNER",
  "JR_GRAPHIC_DESIGNER",
  "SR_DEVELOPER",
  "PRODUCT_OWNER",
  "CEO",
  "CTO",
  "CFO",
  "BRAND_FACE",
  "HR",
  "ADMIN",
];

// Roles that can review/approve videos
const REVIEW_ROLES = [
  "BRAND_FACE",
  "CTO",
  "CEO",
  "CFO",
  "PRODUCT_OWNER",
  "HR",
  "ADMIN",
];

// Senior roles that can see all videos
const SENIOR_ROLES = [
  "CEO",
  "CTO",
  "CFO",
  "BRAND_FACE",
  "PRODUCT_OWNER",
  "HR",
  "ADMIN",
];

// ---------------------------------------------------------------------------
// GET /api/video-reviews
//   ?id=xxx         - Single video with comments, approvals, uploader info
//   ?projectId=xxx  - Filter by project
//   ?status=xxx     - Filter by status
//   (no params)     - List all videos the user can see
// ---------------------------------------------------------------------------
export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("id");
  const projectId = searchParams.get("projectId");
  const statusFilter = searchParams.get("status");

  // ── Single video detail ──────────────────────────────────────
  if (videoId) {
    const video = await prisma.videoReview.findUnique({
      where: { id: videoId },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
        },
        project: {
          select: { id: true, name: true },
        },
        comments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
            },
            replies: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
          where: { parentId: null }, // top-level comments only
          orderBy: { createdAt: "desc" },
        },
        approvals: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        revisions: {
          select: { id: true, version: true, title: true, status: true, createdAt: true },
          orderBy: { version: "desc" },
        },
        parent: {
          select: { id: true, version: true, title: true, status: true },
        },
      },
    });

    if (!video) return jsonError("Video not found", 404);

    // Access check: uploader, assigned reviewer, or senior role
    const canView =
      video.uploaderId === user.id ||
      video.assignedTo.includes(user.id) ||
      SENIOR_ROLES.includes(user.role);

    if (!canView) return jsonError("You don't have permission to view this video", 403);

    return jsonOk({ success: true, data: video });
  }

  // ── List videos ──────────────────────────────────────────────
  const where: Record<string, unknown> = {};

  // Non-senior users only see their uploads + assigned reviews
  if (!SENIOR_ROLES.includes(user.role)) {
    where.OR = [
      { uploaderId: user.id },
      { assignedTo: { has: user.id } },
    ];
  }

  if (projectId) where.projectId = projectId;
  if (statusFilter) where.status = statusFilter;

  const videos = await prisma.videoReview.findMany({
    where,
    include: {
      uploader: {
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
      },
      project: {
        select: { id: true, name: true },
      },
      _count: {
        select: { comments: true, approvals: true },
      },
      approvals: {
        select: { status: true, userId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = videos.map((v) => {
    const approvedCount = v.approvals.filter((a) => a.status === "APPROVED").length;
    const totalReviewers = v.assignedTo.length;
    return {
      ...v,
      commentCount: v._count.comments,
      approvalCount: v._count.approvals,
      approvedCount,
      totalReviewers,
      allApproved: totalReviewers > 0 && approvedCount >= totalReviewers,
    };
  });

  return jsonOk({ success: true, data });
});

// ---------------------------------------------------------------------------
// POST /api/video-reviews — action-based operations
// ---------------------------------------------------------------------------
export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const body = await req.json();
  const { action } = body;

  // ── upload ────────────────────────────────────────────────────
  if (action === "upload") {
    if (!UPLOAD_ROLES.includes(user.role)) {
      return jsonError("You don't have permission to upload content for review", 403);
    }

    const { title, description, fileName, fileUrl, externalUrl, thumbnailUrl, duration, fileSize, mimeType, projectId, assignedTo, contentType, sourceType, purpose } = body;

    if (!title || !String(title).trim()) return jsonError("Title is required", 400);

    // For external links, fileName can be derived
    const resolvedFileName = fileName || (externalUrl ? "External Link" : null);
    const resolvedFileUrl = fileUrl || externalUrl || null;
    if (!resolvedFileUrl) return jsonError("Either fileUrl or externalUrl is required", 400);

    const video = await prisma.videoReview.create({
      data: {
        title: String(title).trim(),
        description: description || null,
        contentType: contentType || "VIDEO",
        sourceType: sourceType || (externalUrl ? "EXTERNAL_LINK" : "SERVER_UPLOAD"),
        fileName: resolvedFileName || "untitled",
        fileUrl: resolvedFileUrl,
        externalUrl: externalUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration ? parseFloat(duration) : null,
        fileSize: fileSize ? parseInt(fileSize, 10) : null,
        mimeType: mimeType || null,
        projectId: projectId || null,
        uploaderId: user.id,
        assignedTo: Array.isArray(assignedTo) ? assignedTo : [],
        workspaceId: user.workspaceId,
        status: "PENDING_REVIEW",
        purpose: purpose || null,
      },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    // Notify assigned reviewers
    if (Array.isArray(assignedTo)) {
      for (const reviewerId of assignedTo) {
        if (reviewerId !== user.id) {
          createNotification(
            reviewerId,
            "SYSTEM",
            "Video review assigned",
            `${user.firstName || "Someone"} uploaded "${video.title}" for your review.`,
            `/video-reviews?id=${video.id}`,
            { videoId: video.id }
          ).catch(console.error);
        }
      }
    }

    return jsonOk({ success: true, data: video }, 201);
  }

  // ── comment ──────────────────────────────────────────────────
  if (action === "comment") {
    const { videoId, content, timestamp, parentId } = body;

    if (!videoId) return jsonError("videoId is required", 400);
    if (!content || !String(content).trim()) return jsonError("content is required", 400);

    const video = await prisma.videoReview.findUnique({ where: { id: videoId } });
    if (!video) return jsonError("Video not found", 404);

    // Access check: uploader, assigned reviewer, or senior role
    const canComment =
      video.uploaderId === user.id ||
      video.assignedTo.includes(user.id) ||
      SENIOR_ROLES.includes(user.role);

    if (!canComment) return jsonError("You don't have permission to comment on this video", 403);

    // Validate parentId if provided
    if (parentId) {
      const parentComment = await prisma.videoComment.findUnique({ where: { id: parentId } });
      if (!parentComment) return jsonError("Parent comment not found", 404);
      if (parentComment.videoId !== videoId) return jsonError("Parent comment belongs to a different video", 400);
    }

    const comment = await prisma.videoComment.create({
      data: {
        videoId,
        userId: user.id,
        content: String(content).trim(),
        timestamp: timestamp !== undefined && timestamp !== null ? parseFloat(timestamp) : null,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
        },
      },
    });

    // Update video status to IN_REVIEW if still pending
    if (video.status === "PENDING_REVIEW") {
      await prisma.videoReview.update({
        where: { id: videoId },
        data: { status: "IN_REVIEW" },
      });
    }

    // Notify video uploader
    if (video.uploaderId !== user.id) {
      createNotification(
        video.uploaderId,
        "SYSTEM",
        "New comment on your video",
        `${user.firstName || "Someone"} commented on "${video.title}"${timestamp !== undefined && timestamp !== null ? ` at ${formatTimestamp(parseFloat(timestamp))}` : ""}.`,
        `/video-reviews?id=${videoId}`,
        { videoId, commentId: comment.id }
      ).catch(console.error);
    }

    return jsonOk({ success: true, data: comment }, 201);
  }

  // ── approve ──────────────────────────────────────────────────
  if (action === "approve") {
    const { videoId, note } = body;

    if (!videoId) return jsonError("videoId is required", 400);

    const video = await prisma.videoReview.findUnique({ where: { id: videoId } });
    if (!video) return jsonError("Video not found", 404);

    // Only assigned reviewers or C-level can approve
    const canApprove =
      video.assignedTo.includes(user.id) ||
      REVIEW_ROLES.includes(user.role);

    if (!canApprove) return jsonError("You don't have permission to approve this video", 403);

    const approval = await prisma.videoApproval.create({
      data: {
        videoId,
        userId: user.id,
        status: "APPROVED",
        note: note || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
        },
      },
    });

    // Check if all assigned reviewers have approved
    const allApprovals = await prisma.videoApproval.findMany({
      where: { videoId, status: "APPROVED" },
      select: { userId: true },
    });
    const approvedUserIds = new Set(allApprovals.map((a) => a.userId));
    const allReviewersApproved =
      video.assignedTo.length > 0 &&
      video.assignedTo.every((id) => approvedUserIds.has(id));

    if (allReviewersApproved) {
      await prisma.videoReview.update({
        where: { id: videoId },
        data: { status: "APPROVED" },
      });
    }

    // Notify uploader
    if (video.uploaderId !== user.id) {
      createNotification(
        video.uploaderId,
        "SYSTEM",
        allReviewersApproved ? "Video fully approved!" : "Video approved by reviewer",
        allReviewersApproved
          ? `"${video.title}" has been approved by all reviewers.`
          : `${user.firstName || "Someone"} approved "${video.title}".`,
        `/video-reviews?id=${videoId}`,
        { videoId, approvalId: approval.id, allApproved: allReviewersApproved }
      ).catch(console.error);
    }

    return jsonOk({
      success: true,
      data: { ...approval, allReviewersApproved },
    });
  }

  // ── requestChanges ───────────────────────────────────────────
  if (action === "requestChanges") {
    const { videoId, note } = body;

    if (!videoId) return jsonError("videoId is required", 400);

    const video = await prisma.videoReview.findUnique({ where: { id: videoId } });
    if (!video) return jsonError("Video not found", 404);

    const canReview =
      video.assignedTo.includes(user.id) ||
      REVIEW_ROLES.includes(user.role);

    if (!canReview) return jsonError("You don't have permission to request changes", 403);

    const approval = await prisma.videoApproval.create({
      data: {
        videoId,
        userId: user.id,
        status: "CHANGES_REQUESTED",
        note: note || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
        },
      },
    });

    // Set video status to CHANGES_REQUESTED
    await prisma.videoReview.update({
      where: { id: videoId },
      data: { status: "CHANGES_REQUESTED" },
    });

    // Notify uploader
    if (video.uploaderId !== user.id) {
      createNotification(
        video.uploaderId,
        "SYSTEM",
        "Changes requested on your video",
        `${user.firstName || "Someone"} requested changes on "${video.title}".${note ? ` Note: ${note}` : ""}`,
        `/video-reviews?id=${videoId}`,
        { videoId, approvalId: approval.id }
      ).catch(console.error);
    }

    return jsonOk({ success: true, data: approval });
  }

  // ── reject ───────────────────────────────────────────────────
  if (action === "reject") {
    const { videoId, note } = body;

    if (!videoId) return jsonError("videoId is required", 400);

    const video = await prisma.videoReview.findUnique({ where: { id: videoId } });
    if (!video) return jsonError("Video not found", 404);

    const canReview =
      video.assignedTo.includes(user.id) ||
      REVIEW_ROLES.includes(user.role);

    if (!canReview) return jsonError("You don't have permission to reject this video", 403);

    const approval = await prisma.videoApproval.create({
      data: {
        videoId,
        userId: user.id,
        status: "REJECTED",
        note: note || null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
        },
      },
    });

    // Set video status to REJECTED
    await prisma.videoReview.update({
      where: { id: videoId },
      data: { status: "REJECTED" },
    });

    // Notify uploader
    if (video.uploaderId !== user.id) {
      createNotification(
        video.uploaderId,
        "SYSTEM",
        "Video rejected",
        `${user.firstName || "Someone"} rejected "${video.title}".${note ? ` Reason: ${note}` : ""}`,
        `/video-reviews?id=${videoId}`,
        { videoId, approvalId: approval.id }
      ).catch(console.error);
    }

    return jsonOk({ success: true, data: approval });
  }

  // ── resolve ──────────────────────────────────────────────────
  if (action === "resolve") {
    const { commentId } = body;

    if (!commentId) return jsonError("commentId is required", 400);

    const comment = await prisma.videoComment.findUnique({
      where: { id: commentId },
      include: { video: true },
    });
    if (!comment) return jsonError("Comment not found", 404);

    // Only video uploader or comment author can resolve
    const canResolve =
      comment.video.uploaderId === user.id ||
      comment.userId === user.id;

    if (!canResolve) return jsonError("Only the video uploader or comment author can resolve comments", 403);

    const updated = await prisma.videoComment.update({
      where: { id: commentId },
      data: {
        resolved: true,
        resolvedBy: user.id,
        resolvedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
        },
      },
    });

    return jsonOk({ success: true, data: updated });
  }

  // ── revise ───────────────────────────────────────────────────
  if (action === "revise") {
    if (!UPLOAD_ROLES.includes(user.role)) {
      return jsonError("You don't have permission to upload revisions", 403);
    }

    const { parentId, title, fileName, fileUrl, externalUrl, thumbnailUrl, duration, fileSize, mimeType } = body;

    if (!parentId) return jsonError("parentId is required", 400);
    const resolvedFileUrl = fileUrl || externalUrl || null;
    if (!resolvedFileUrl) return jsonError("Either fileUrl or externalUrl is required", 400);

    const parentVideo = await prisma.videoReview.findUnique({ where: { id: parentId } });
    if (!parentVideo) return jsonError("Parent video not found", 404);

    // Find the highest version in the chain
    const latestVersion = await prisma.videoReview.findFirst({
      where: {
        OR: [
          { id: parentVideo.parentId || parentVideo.id },
          { parentId: parentVideo.parentId || parentVideo.id },
        ],
      },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const newVersion = (latestVersion?.version || parentVideo.version) + 1;

    const revision = await prisma.videoReview.create({
      data: {
        title: title || parentVideo.title,
        description: parentVideo.description,
        contentType: parentVideo.contentType,
        sourceType: externalUrl ? "EXTERNAL_LINK" : parentVideo.sourceType,
        fileName: fileName || (externalUrl ? "External Link" : parentVideo.fileName),
        fileUrl: resolvedFileUrl,
        externalUrl: externalUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        duration: duration ? parseFloat(duration) : null,
        fileSize: fileSize ? parseInt(fileSize, 10) : null,
        mimeType: mimeType || parentVideo.mimeType,
        status: "PENDING_REVIEW",
        version: newVersion,
        parentId,
        projectId: parentVideo.projectId,
        uploaderId: user.id,
        assignedTo: parentVideo.assignedTo,
        workspaceId: parentVideo.workspaceId,
      },
      include: {
        uploader: {
          select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    // Notify all assigned reviewers
    for (const reviewerId of parentVideo.assignedTo) {
      if (reviewerId !== user.id) {
        createNotification(
          reviewerId,
          "SYSTEM",
          "New video revision uploaded",
          `${user.firstName || "Someone"} uploaded version ${newVersion} of "${revision.title}" for review.`,
          `/video-reviews?id=${revision.id}`,
          { videoId: revision.id, parentId, version: newVersion }
        ).catch(console.error);
      }
    }

    return jsonOk({ success: true, data: revision }, 201);
  }

  return jsonError(
    "Invalid action. Supported: upload, comment, approve, requestChanges, reject, resolve, revise",
    400
  );
});

// ---------------------------------------------------------------------------
// PATCH /api/video-reviews — update video details
// ---------------------------------------------------------------------------
export const PATCH = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const body = await req.json();
  const { id } = body;

  if (!id) return jsonError("id is required", 400);

  const video = await prisma.videoReview.findUnique({ where: { id } });
  if (!video) return jsonError("Video not found", 404);

  // Only uploader or senior roles can update
  const canUpdate =
    video.uploaderId === user.id ||
    SENIOR_ROLES.includes(user.role);

  if (!canUpdate) return jsonError("You don't have permission to update this video", 403);

  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.assignedTo !== undefined && Array.isArray(body.assignedTo)) data.assignedTo = body.assignedTo;
  if (body.status !== undefined) data.status = body.status;

  if (Object.keys(data).length === 0) return jsonError("No fields to update", 400);

  const updated = await prisma.videoReview.update({
    where: { id },
    data,
    include: {
      uploader: {
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
      },
      project: {
        select: { id: true, name: true },
      },
      _count: {
        select: { comments: true, approvals: true },
      },
    },
  });

  // If assignedTo changed, notify new reviewers
  if (body.assignedTo !== undefined && Array.isArray(body.assignedTo)) {
    const newReviewers = body.assignedTo.filter(
      (rid: string) => !video.assignedTo.includes(rid) && rid !== user.id
    );
    for (const reviewerId of newReviewers) {
      createNotification(
        reviewerId,
        "SYSTEM",
        "Video review assigned",
        `${user.firstName || "Someone"} assigned you to review "${updated.title}".`,
        `/video-reviews?id=${id}`,
        { videoId: id }
      ).catch(console.error);
    }
  }

  return jsonOk({ success: true, data: updated });
});

// ---------------------------------------------------------------------------
// DELETE /api/video-reviews?id=xxx
// ---------------------------------------------------------------------------
export const DELETE = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return jsonError("id query param is required", 400);

  const video = await prisma.videoReview.findUnique({ where: { id } });
  if (!video) return jsonError("Video not found", 404);

  // Only uploader or senior roles can delete
  const canDelete =
    video.uploaderId === user.id ||
    SENIOR_ROLES.includes(user.role);

  if (!canDelete) return jsonError("You don't have permission to delete this video", 403);

  // Cascade delete: comments and approvals are handled by onDelete: Cascade
  // But we need to handle revisions — unlink them first
  await prisma.videoReview.updateMany({
    where: { parentId: id },
    data: { parentId: null },
  });

  await prisma.videoReview.delete({ where: { id } });

  return jsonOk({ success: true, message: "Video review and associated data deleted" });
});

// ---------------------------------------------------------------------------
// Helper: format seconds to MM:SS display
// ---------------------------------------------------------------------------
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
