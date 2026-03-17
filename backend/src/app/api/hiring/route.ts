import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

// Full management access: CEO/CTO/ADMIN/HR/PRODUCT_OWNER
const MANAGE_ROLES = ["CEO", "CTO", "ADMIN", "HR", "PRODUCT_OWNER"];

// SR_DEVELOPER can view job postings and be assigned as interviewer
const VIEW_ROLES = [...MANAGE_ROLES, "SR_DEVELOPER"];

// Pipeline stage ordering for advanceCandidate
const STAGE_ORDER: Record<string, string> = {
  APPLIED: "RESUME_REVIEW",
  RESUME_REVIEW: "UNDER_REVIEW",
  UNDER_REVIEW: "SHORTLISTED",
  SHORTLISTED: "INTERVIEW_ROUND_1",
  INTERVIEW_ROUND_1: "PRACTICAL_TASK",
  PRACTICAL_TASK: "ASSIGNMENT_SENT",
  ASSIGNMENT_SENT: "ASSIGNMENT_PASSED",
  ASSIGNMENT_PASSED: "INTERVIEW_ROUND_2",
  INTERVIEW_ROUND_2: "FINAL_INTERVIEW",
  FINAL_INTERVIEW: "OFFERED",
  OFFERED: "HIRED",
};

// Kanban column mapping — groups detailed statuses into 7 visual columns
const KANBAN_COLUMNS: Record<string, string[]> = {
  Applied: ["APPLIED", "RESUME_REVIEW"],
  "Under Review": ["UNDER_REVIEW", "SHORTLISTED"],
  Shortlisted: ["INTERVIEW_ROUND_1"],
  Interview: ["INTERVIEW_ROUND_2", "FINAL_INTERVIEW"],
  Assignment: ["PRACTICAL_TASK", "ASSIGNMENT_SENT", "ASSIGNMENT_PASSED"],
  Offered: ["OFFERED"],
  Hired: ["HIRED"],
};

// ---------------------------------------------------------------------------
// GET /api/hiring
//   ?jobId=X                       → single job with ALL candidates, comments count, rating avg, events count
//   ?candidates=true&jobId=X       → just candidates with filters: status, tier, search, source
//   ?view=kanban&jobId=X           → candidates grouped by kanban columns
//   (no jobId)                     → all jobs with candidate counts per status
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!VIEW_ROLES.includes(user.role)) {
      return jsonOk({ success: true, data: [] });
    }

    const isSrDeveloper = user.role === "SR_DEVELOPER";
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const candidatesOnly = searchParams.get("candidates") === "true";
    const viewMode = searchParams.get("view"); // "kanban" or null
    const statusFilter = searchParams.get("status");
    const tierFilter = searchParams.get("tier");
    const searchQuery = searchParams.get("search");
    const sourceFilter = searchParams.get("source");

    // ── Single job with full candidate data ─────────────────────
    if (jobId && !candidatesOnly && viewMode !== "kanban") {
      const candidateWhere: Record<string, unknown> = {};
      if (isSrDeveloper) {
        // SR_DEVELOPER only sees interviews they're assigned to — but we still return candidates
      }

      const job = await prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          candidates: {
            where: candidateWhere,
            include: {
              reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
              interviews: {
                include: {
                  interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
                orderBy: { roundNumber: "asc" },
                ...(isSrDeveloper ? { where: { interviewerId: user.id } } : {}),
              },
              comments: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
              _count: {
                select: { comments: true, events: true, ratings: true },
              },
              ratings: true,
            },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { candidates: true } },
        },
      });

      if (!job) return jsonError("Job not found", 404);

      // Compute per-candidate avgRating from ratings
      const enrichedCandidates = job.candidates.map((c) => {
        const avgRating =
          c.ratings.length > 0
            ? c.ratings.reduce((sum, r) => sum + r.rating, 0) / c.ratings.length
            : null;
        return {
          ...c,
          avgRating,
          commentsCount: c._count.comments,
          eventsCount: c._count.events,
          ratingsCount: c._count.ratings,
          latestComment: c.comments[0] || null,
        };
      });

      // Build status counts
      const statusCounts: Record<string, number> = {};
      for (const c of job.candidates) {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      }

      return jsonOk({
        success: true,
        data: {
          ...job,
          candidates: enrichedCandidates,
          statusCounts,
        },
      });
    }

    // ── Candidates only with filters ────────────────────────────
    if (jobId && (candidatesOnly || viewMode === "kanban")) {
      const where: Record<string, unknown> = { jobId };
      if (statusFilter && statusFilter !== "All") where.status = statusFilter;
      if (tierFilter && tierFilter !== "All") where.tier = tierFilter;
      if (sourceFilter && sourceFilter !== "All") where.source = sourceFilter;
      if (searchQuery) {
        where.OR = [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { email: { contains: searchQuery, mode: "insensitive" } },
          { phone: { contains: searchQuery, mode: "insensitive" } },
        ];
      }

      const candidates = await prisma.jobCandidate.findMany({
        where,
        include: {
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
          interviews: {
            include: {
              interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { roundNumber: "asc" },
            ...(isSrDeveloper ? { where: { interviewerId: user.id } } : {}),
          },
          comments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: { comments: true, events: true, ratings: true },
          },
          ratings: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const enriched = candidates.map((c) => {
        const avgRating =
          c.ratings.length > 0
            ? c.ratings.reduce((sum, r) => sum + r.rating, 0) / c.ratings.length
            : null;
        return {
          ...c,
          avgRating,
          commentsCount: c._count.comments,
          eventsCount: c._count.events,
          ratingsCount: c._count.ratings,
          latestComment: c.comments[0] || null,
        };
      });

      // Kanban view: group by columns
      if (viewMode === "kanban") {
        const kanban: Record<string, typeof enriched> = {};
        for (const [col, statuses] of Object.entries(KANBAN_COLUMNS)) {
          kanban[col] = enriched.filter((c) => statuses.includes(c.status));
        }
        // Rejected / Not Good / Maybe / On Hold go into a special bucket
        kanban["Rejected"] = enriched.filter((c) =>
          ["REJECTED", "NOT_GOOD", "MAYBE", "ON_HOLD"].includes(c.status)
        );
        return jsonOk({ success: true, data: kanban });
      }

      return jsonOk({ success: true, data: enriched });
    }

    // ── All jobs with candidate counts per status ───────────────
    const department = searchParams.get("department");
    const jobStatus = searchParams.get("jobStatus");

    const jobsWhere: Record<string, unknown> = {};
    if (department && department !== "All") jobsWhere.department = department;
    if (jobStatus && jobStatus !== "All") jobsWhere.status = jobStatus;

    const jobs = await prisma.jobPosting.findMany({
      where: jobsWhere,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        candidates: {
          select: { status: true },
        },
        _count: { select: { candidates: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = jobs.map((j) => {
      const statusCounts: Record<string, number> = {};
      for (const c of j.candidates) {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      }
      return {
        ...j,
        candidates: undefined,
        candidateCount: j._count.candidates,
        statusCounts,
      };
    });

    return jsonOk({ success: true, data });
  } catch (error) {
    console.error("Hiring GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/hiring — action-based operations
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { action } = body;

    // ── createJob ──────────────────────────────────────────────
    if (action === "createJob") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only CEO, CTO, Admin, HR, or Product Owner can create jobs", 403);
      }

      const { title, department, description, requirements, salaryMin, salaryMax, currency, location, type, status } = body;
      if (!title || !String(title).trim()) return jsonError("Title is required", 400);

      const parsedSalaryMin = salaryMin ? parseInt(salaryMin, 10) : null;
      const parsedSalaryMax = salaryMax ? parseInt(salaryMax, 10) : null;
      if (parsedSalaryMin !== null && isNaN(parsedSalaryMin)) return jsonError("Invalid salaryMin value", 400);
      if (parsedSalaryMax !== null && isNaN(parsedSalaryMax)) return jsonError("Invalid salaryMax value", 400);
      if (parsedSalaryMin !== null && parsedSalaryMax !== null && parsedSalaryMin > parsedSalaryMax) {
        return jsonError("salaryMin cannot be greater than salaryMax", 400);
      }

      const job = await prisma.jobPosting.create({
        data: {
          title: String(title).trim(),
          department: department || null,
          description: description || null,
          requirements: requirements || null,
          salaryMin: parsedSalaryMin,
          salaryMax: parsedSalaryMax,
          currency: currency || "INR",
          location: location || null,
          type: type || "Full-time",
          status: status || "OPEN",
          createdById: user.id,
        },
      });

      return jsonOk({ success: true, data: job }, 201);
    }

    // ── addCandidate ───────────────────────────────────────────
    if (action === "addCandidate") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only CEO, CTO, Admin, HR, or Product Owner can add candidates", 403);
      }

      const {
        jobId, name, email, phone, whatsappNumber, resumeUrl, resumeFileName,
        linkedinUrl, portfolioUrl, instagramUrl, coverLetter, location,
        experience, education, skills, tier, source, reviewerId,
      } = body;
      if (!jobId || !name || !email) return jsonError("jobId, name, and email are required", 400);

      const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
      if (!job) return jsonError("Job not found", 404);

      const candidate = await prisma.jobCandidate.create({
        data: {
          jobId,
          name,
          email,
          phone: phone || null,
          whatsappNumber: whatsappNumber || null,
          resumeUrl: resumeUrl || null,
          resumeFileName: resumeFileName || null,
          linkedinUrl: linkedinUrl || null,
          portfolioUrl: portfolioUrl || null,
          instagramUrl: instagramUrl || null,
          coverLetter: coverLetter || null,
          location: location || null,
          experience: experience || null,
          education: education || null,
          skills: skills ? (typeof skills === "string" ? skills : JSON.stringify(skills)) : null,
          tier: tier || "UNTIERED",
          source: source || "MANUAL",
          reviewerId: reviewerId || null,
          status: "APPLIED",
          statusChangedAt: new Date(),
          statusChangedBy: user.id,
        },
        include: {
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      // Log creation event
      await prisma.candidateEvent.create({
        data: {
          candidateId: candidate.id,
          eventType: "created",
          toValue: "APPLIED",
          createdBy: user.id,
        },
      });

      return jsonOk({ success: true, data: candidate }, 201);
    }

    // ── importCandidates ────────────────────────────────────────
    if (action === "importCandidates") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only CEO, CTO, Admin, HR, or Product Owner can import candidates", 403);
      }

      const { jobId, candidates: candidatesData } = body;
      if (!jobId || !Array.isArray(candidatesData) || candidatesData.length === 0) {
        return jsonError("jobId and a non-empty candidates array are required", 400);
      }

      const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
      if (!job) return jsonError("Job not found", 404);

      const batchId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const created = [];
      const errors = [];

      for (let i = 0; i < candidatesData.length; i++) {
        const row = candidatesData[i];
        if (!row.name || !row.email) {
          errors.push({ row: i + 1, error: "name and email are required" });
          continue;
        }
        try {
          const c = await prisma.jobCandidate.create({
            data: {
              jobId,
              name: row.name,
              email: row.email,
              phone: row.phone || null,
              whatsappNumber: row.whatsappNumber || null,
              resumeUrl: row.resumeUrl || null,
              linkedinUrl: row.linkedinUrl || null,
              portfolioUrl: row.portfolioUrl || null,
              coverLetter: row.coverLetter || null,
              location: row.location || null,
              experience: row.experience || null,
              education: row.education || null,
              skills: row.skills ? (typeof row.skills === "string" ? row.skills : JSON.stringify(row.skills)) : null,
              tier: row.tier || "UNTIERED",
              source: row.source || "CSV",
              importBatchId: batchId,
              status: "APPLIED",
              statusChangedAt: new Date(),
              statusChangedBy: user.id,
            },
          });

          await prisma.candidateEvent.create({
            data: {
              candidateId: c.id,
              eventType: "imported",
              toValue: "APPLIED",
              createdBy: user.id,
            },
          });

          created.push(c);
        } catch (err) {
          errors.push({ row: i + 1, error: String(err) });
        }
      }

      return jsonOk({
        success: true,
        data: { imported: created.length, errors: errors.length, errorDetails: errors, batchId },
      }, 201);
    }

    // ── changeStatus ────────────────────────────────────────────
    if (action === "changeStatus") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only management can change candidate status", 403);
      }

      const { candidateId, status, rejectionReason, rejectionMessage } = body;
      if (!candidateId || !status) return jsonError("candidateId and status are required", 400);

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const oldStatus = candidate.status;
      const updateData: Record<string, unknown> = {
        status,
        statusChangedAt: new Date(),
        statusChangedBy: user.id,
      };
      if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
      if (rejectionMessage !== undefined) updateData.rejectionMessage = rejectionMessage;

      const updated = await prisma.jobCandidate.update({
        where: { id: candidateId },
        data: updateData as never,
        include: {
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
          interviews: {
            include: { interviewer: { select: { id: true, firstName: true, lastName: true, email: true } } },
            orderBy: { roundNumber: "asc" },
          },
        },
      });

      // Log status change event
      await prisma.candidateEvent.create({
        data: {
          candidateId,
          eventType: "status_change",
          fromValue: oldStatus,
          toValue: status,
          createdBy: user.id,
        },
      });

      // Notify reviewer
      if (candidate.reviewerId && candidate.reviewerId !== user.id) {
        createNotification(
          candidate.reviewerId,
          "SYSTEM",
          "Candidate status changed",
          `${candidate.name} moved from ${oldStatus.replace(/_/g, " ")} to ${status.replace(/_/g, " ")}.`,
          `/hiring?jobId=${candidate.jobId}`,
          { candidateId, oldStatus, newStatus: status }
        ).catch(console.error);
      }

      return jsonOk({ success: true, data: updated });
    }

    // ── addComment ──────────────────────────────────────────────
    if (action === "addComment") {
      if (!VIEW_ROLES.includes(user.role)) {
        return jsonError("You don't have permission to comment", 403);
      }

      const { candidateId, body: commentBody, mentions } = body;
      if (!candidateId || !commentBody) return jsonError("candidateId and body are required", 400);

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const comment = await prisma.candidateComment.create({
        data: {
          candidateId,
          body: commentBody,
          mentions: mentions ? JSON.stringify(mentions) : null,
          createdBy: user.id,
        },
      });

      // Log comment event
      await prisma.candidateEvent.create({
        data: {
          candidateId,
          eventType: "comment",
          toValue: commentBody.substring(0, 200),
          createdBy: user.id,
        },
      });

      // Notify mentioned users
      if (Array.isArray(mentions)) {
        for (const m of mentions) {
          if (m.userId && m.userId !== user.id) {
            createNotification(
              m.userId,
              "SYSTEM",
              "You were mentioned in a comment",
              `${user.firstName || "Someone"} mentioned you in a comment on ${candidate.name}'s profile.`,
              `/hiring?jobId=${candidate.jobId}`,
              { candidateId, commentId: comment.id }
            ).catch(console.error);
          }
        }
      }

      return jsonOk({ success: true, data: comment }, 201);
    }

    // ── rateCandidate ───────────────────────────────────────────
    if (action === "rateCandidate") {
      if (!VIEW_ROLES.includes(user.role)) {
        return jsonError("You don't have permission to rate candidates", 403);
      }

      const { candidateId, rating } = body;
      if (!candidateId || rating === undefined) return jsonError("candidateId and rating are required", 400);

      const parsedRating = parseInt(rating, 10);
      if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
        return jsonError("Rating must be between 1 and 5", 400);
      }

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      // Upsert user's rating
      await prisma.candidateRating.upsert({
        where: { candidateId_userId: { candidateId, userId: user.id } },
        create: { candidateId, userId: user.id, rating: parsedRating },
        update: { rating: parsedRating },
      });

      // Recalculate average rating
      const allRatings = await prisma.candidateRating.findMany({ where: { candidateId } });
      const avg = allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length;

      await prisma.jobCandidate.update({
        where: { id: candidateId },
        data: { rating: Math.round(avg * 100) / 100 },
      });

      // Log rating event
      await prisma.candidateEvent.create({
        data: {
          candidateId,
          eventType: "rating",
          toValue: String(parsedRating),
          createdBy: user.id,
        },
      });

      return jsonOk({ success: true, data: { rating: parsedRating, avgRating: avg } });
    }

    // ── advanceCandidate ───────────────────────────────────────
    if (action === "advanceCandidate") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only management can advance candidates", 403);
      }

      const { candidateId } = body;
      if (!candidateId) return jsonError("candidateId is required", 400);

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const nextStage = STAGE_ORDER[candidate.status];
      if (!nextStage) return jsonError(`Cannot advance from ${candidate.status}`, 400);

      const updated = await prisma.jobCandidate.update({
        where: { id: candidateId },
        data: {
          status: nextStage as never,
          statusChangedAt: new Date(),
          statusChangedBy: user.id,
        },
        include: {
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
          interviews: {
            include: { interviewer: { select: { id: true, firstName: true, lastName: true, email: true } } },
            orderBy: { roundNumber: "asc" },
          },
        },
      });

      // Log event
      await prisma.candidateEvent.create({
        data: {
          candidateId,
          eventType: "status_change",
          fromValue: candidate.status,
          toValue: nextStage,
          createdBy: user.id,
        },
      });

      // Notify reviewer
      if (candidate.reviewerId && candidate.reviewerId !== user.id) {
        createNotification(
          candidate.reviewerId,
          "SYSTEM",
          "Candidate advanced",
          `${candidate.name} has been advanced to ${nextStage.replace(/_/g, " ")}.`,
          `/hiring?jobId=${candidate.jobId}`,
          { candidateId, newStage: nextStage }
        ).catch(console.error);
      }

      return jsonOk({ success: true, data: updated });
    }

    // ── rejectCandidate ────────────────────────────────────────
    if (action === "rejectCandidate") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only management can reject candidates", 403);
      }

      const { candidateId, rejectionReason, rejectionMessage, notes } = body;
      if (!candidateId) return jsonError("candidateId is required", 400);

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const oldStatus = candidate.status;

      const updated = await prisma.jobCandidate.update({
        where: { id: candidateId },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason || null,
          rejectionMessage: rejectionMessage || null,
          finalNotes: notes || candidate.finalNotes,
          statusChangedAt: new Date(),
          statusChangedBy: user.id,
        },
      });

      // Log event
      await prisma.candidateEvent.create({
        data: {
          candidateId,
          eventType: "status_change",
          fromValue: oldStatus,
          toValue: "REJECTED",
          createdBy: user.id,
        },
      });

      // Notify reviewer
      if (candidate.reviewerId && candidate.reviewerId !== user.id) {
        createNotification(
          candidate.reviewerId,
          "SYSTEM",
          "Candidate rejected",
          `${candidate.name} has been rejected.`,
          `/hiring?jobId=${candidate.jobId}`,
          { candidateId }
        ).catch(console.error);
      }

      return jsonOk({ success: true, data: updated });
    }

    // ── offerCandidate ─────────────────────────────────────────
    if (action === "offerCandidate") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only management can make offers", 403);
      }

      const { candidateId, offeredSalary, notes } = body;
      if (!candidateId) return jsonError("candidateId is required", 400);

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const oldStatus = candidate.status;

      const updated = await prisma.jobCandidate.update({
        where: { id: candidateId },
        data: {
          status: "OFFERED",
          offeredSalary: offeredSalary ? parseInt(offeredSalary) : null,
          finalNotes: notes || candidate.finalNotes,
          statusChangedAt: new Date(),
          statusChangedBy: user.id,
        },
      });

      // Log event
      await prisma.candidateEvent.create({
        data: {
          candidateId,
          eventType: "status_change",
          fromValue: oldStatus,
          toValue: "OFFERED",
          createdBy: user.id,
        },
      });

      return jsonOk({ success: true, data: updated });
    }

    // ── scheduleInterview ───────────────────────────────────────
    if (action === "scheduleInterview") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only management can schedule interviews", 403);
      }

      const { candidateId, roundNumber, roundName, interviewerId, scheduledAt } = body;
      if (!candidateId || !roundNumber || !roundName || !interviewerId) {
        return jsonError("candidateId, roundNumber, roundName, and interviewerId are required", 400);
      }

      const parsedRoundNumber = parseInt(roundNumber, 10);
      if (isNaN(parsedRoundNumber) || parsedRoundNumber < 1) {
        return jsonError("roundNumber must be a positive integer", 400);
      }

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const interviewer = await prisma.user.findUnique({ where: { id: interviewerId } });
      if (!interviewer) return jsonError("Interviewer not found", 404);

      const interview = await prisma.interviewRound.create({
        data: {
          candidateId,
          roundNumber: parsedRoundNumber,
          roundName,
          interviewerId,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        },
        include: {
          interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      // Log event
      await prisma.candidateEvent.create({
        data: {
          candidateId,
          eventType: "interview_scheduled",
          toValue: `${roundName} (Round ${parsedRoundNumber})`,
          createdBy: user.id,
        },
      });

      // Notify interviewer
      if (interviewerId !== user.id) {
        createNotification(
          interviewerId,
          "SYSTEM",
          "Interview scheduled",
          `You have been assigned to interview ${candidate.name} — ${roundName}${scheduledAt ? ` on ${new Date(scheduledAt).toLocaleDateString()}` : ""}.`,
          `/hiring?jobId=${candidate.jobId}`,
          { candidateId, interviewId: interview.id, roundName }
        ).catch(console.error);
      }

      return jsonOk({ success: true, data: interview }, 201);
    }

    // ── submitPractical ────────────────────────────────────────
    if (action === "submitPractical") {
      if (!VIEW_ROLES.includes(user.role)) {
        return jsonError("You don't have permission to submit practical tasks", 403);
      }

      const { candidateId, practicalTaskUrl, practicalSubmission, practicalDeadline } = body;
      if (!candidateId) return jsonError("candidateId is required", 400);

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const data: Record<string, unknown> = {};
      if (practicalTaskUrl !== undefined) data.practicalTaskUrl = practicalTaskUrl;
      if (practicalSubmission !== undefined) data.practicalSubmission = practicalSubmission;
      if (practicalDeadline !== undefined) data.practicalDeadline = practicalDeadline ? new Date(practicalDeadline) : null;

      const updated = await prisma.jobCandidate.update({
        where: { id: candidateId },
        data,
      });

      return jsonOk({ success: true, data: updated });
    }

    // ── updateResult ───────────────────────────────────────────
    if (action === "updateResult") {
      const { interviewId, result, feedback, score } = body;
      if (!interviewId || !result) return jsonError("interviewId and result are required", 400);

      const interview = await prisma.interviewRound.findUnique({ where: { id: interviewId } });
      if (!interview) return jsonError("Interview round not found", 404);

      if (interview.interviewerId !== user.id && !MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only the assigned interviewer or a manager can update results", 403);
      }

      const updated = await prisma.interviewRound.update({
        where: { id: interviewId },
        data: {
          result,
          feedback: feedback || null,
          score: score !== undefined && score !== null ? parseInt(score) : null,
          completedAt: result !== "PENDING" ? new Date() : null,
        },
        include: {
          interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      return jsonOk({ success: true, data: updated });
    }

    return jsonError(
      "Invalid action. Supported: createJob, addCandidate, importCandidates, changeStatus, addComment, rateCandidate, advanceCandidate, rejectCandidate, offerCandidate, scheduleInterview, submitPractical, updateResult",
      400
    );
  } catch (error) {
    console.error("Hiring POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/hiring — update job or candidate
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!MANAGE_ROLES.includes(user.role)) {
      return jsonError("Only management can update records", 403);
    }

    const body = await req.json();
    const { id, type: recordType } = body;

    if (!id) return jsonError("id is required", 400);

    // ── Update candidate ──────────────────────────────────────
    if (recordType === "candidate") {
      const candidate = await prisma.jobCandidate.findUnique({ where: { id } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const allowedFields = [
        "name", "email", "phone", "whatsappNumber", "resumeUrl", "resumeFileName",
        "linkedinUrl", "portfolioUrl", "instagramUrl", "coverLetter", "location",
        "experience", "education", "skills", "tier", "reviewerId", "reviewNotes",
        "practicalTaskUrl", "practicalSubmission", "practicalDeadline", "finalNotes",
        "sortOrder", "customFields",
      ];

      const data: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          if (field === "skills" || field === "customFields") {
            data[field] = typeof body[field] === "string" ? body[field] : JSON.stringify(body[field]);
          } else if (field === "practicalDeadline") {
            data[field] = body[field] ? new Date(body[field]) : null;
          } else if (field === "sortOrder") {
            data[field] = parseInt(body[field], 10);
          } else {
            data[field] = body[field];
          }
        }
      }

      // Log tier change as event
      if (body.tier && body.tier !== candidate.tier) {
        await prisma.candidateEvent.create({
          data: {
            candidateId: id,
            eventType: "tier_change",
            fromValue: candidate.tier,
            toValue: body.tier,
            createdBy: user.id,
          },
        });
      }

      // Log field updates
      if (Object.keys(data).length > 0) {
        await prisma.candidateEvent.create({
          data: {
            candidateId: id,
            eventType: "field_update",
            toValue: Object.keys(data).join(", "),
            createdBy: user.id,
          },
        });
      }

      const updated = await prisma.jobCandidate.update({
        where: { id },
        data,
        include: {
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
          interviews: {
            include: { interviewer: { select: { id: true, firstName: true, lastName: true, email: true } } },
            orderBy: { roundNumber: "asc" },
          },
        },
      });

      return jsonOk({ success: true, data: updated });
    }

    // ── Update job posting (default) ──────────────────────────
    const job = await prisma.jobPosting.findUnique({ where: { id } });
    if (!job) return jsonError("Job not found", 404);

    const data: Record<string, unknown> = {};
    const jobFields = ["title", "department", "description", "requirements", "currency", "location", "type", "status"];
    for (const field of jobFields) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    if (body.salaryMin !== undefined) {
      const parsed = body.salaryMin ? parseInt(body.salaryMin, 10) : null;
      if (parsed !== null && isNaN(parsed)) return jsonError("Invalid salaryMin value", 400);
      data.salaryMin = parsed;
    }
    if (body.salaryMax !== undefined) {
      const parsed = body.salaryMax ? parseInt(body.salaryMax, 10) : null;
      if (parsed !== null && isNaN(parsed)) return jsonError("Invalid salaryMax value", 400);
      data.salaryMax = parsed;
    }

    const updated = await prisma.jobPosting.update({ where: { id }, data });

    return jsonOk({ success: true, data: updated });
  } catch (error) {
    console.error("Hiring PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/hiring?id=X&type=job|candidate
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!MANAGE_ROLES.includes(user.role)) {
      return jsonError("Only management can delete records", 403);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) return jsonError("id and type query params are required", 400);

    if (type === "job") {
      const job = await prisma.jobPosting.findUnique({ where: { id } });
      if (!job) return jsonError("Job not found", 404);

      // Cascade delete: ratings, comments, events, interviews, then candidates, then job
      const candidateIds = await prisma.jobCandidate.findMany({
        where: { jobId: id },
        select: { id: true },
      });
      if (candidateIds.length > 0) {
        const ids = candidateIds.map((c) => c.id);
        await prisma.candidateRating.deleteMany({ where: { candidateId: { in: ids } } });
        await prisma.candidateComment.deleteMany({ where: { candidateId: { in: ids } } });
        await prisma.candidateEvent.deleteMany({ where: { candidateId: { in: ids } } });
        await prisma.interviewRound.deleteMany({ where: { candidateId: { in: ids } } });
        await prisma.jobCandidate.deleteMany({ where: { jobId: id } });
      }
      await prisma.jobPosting.delete({ where: { id } });
      return jsonOk({ success: true, message: "Job posting and all associated data deleted" });
    }

    if (type === "candidate") {
      const candidate = await prisma.jobCandidate.findUnique({ where: { id } });
      if (!candidate) return jsonError("Candidate not found", 404);

      // Cascade delete related records
      await prisma.candidateRating.deleteMany({ where: { candidateId: id } });
      await prisma.candidateComment.deleteMany({ where: { candidateId: id } });
      await prisma.candidateEvent.deleteMany({ where: { candidateId: id } });
      await prisma.interviewRound.deleteMany({ where: { candidateId: id } });
      await prisma.jobCandidate.delete({ where: { id } });
      return jsonOk({ success: true, message: "Candidate and all associated data deleted" });
    }

    return jsonError("type must be 'job' or 'candidate'", 400);
  } catch (error) {
    console.error("Hiring DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
