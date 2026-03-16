import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

// Full management access: CEO/CTO/ADMIN/HR/PRODUCT_OWNER
const MANAGE_ROLES = ["CEO", "CTO", "ADMIN", "HR", "PRODUCT_OWNER"];

// SR_DEVELOPER can view job postings and be assigned as interviewer
const VIEW_ROLES = [...MANAGE_ROLES, "SR_DEVELOPER"];

// Pipeline stage ordering
const STAGE_ORDER: Record<string, string> = {
  APPLIED: "RESUME_REVIEW",
  RESUME_REVIEW: "INTERVIEW_ROUND_1",
  INTERVIEW_ROUND_1: "PRACTICAL_TASK",
  PRACTICAL_TASK: "INTERVIEW_ROUND_2",
  INTERVIEW_ROUND_2: "FINAL_INTERVIEW",
  FINAL_INTERVIEW: "OFFERED",
  OFFERED: "HIRED",
};

// ---------------------------------------------------------------------------
// GET /api/hiring
//   ?jobId=xxx  → single job with candidates + interviews
//   (no jobId)  → all jobs with candidate counts
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    // Roles not in VIEW_ROLES get no access
    if (!VIEW_ROLES.includes(user.role)) {
      return jsonOk({ success: true, data: [] });
    }

    const isSrDeveloper = user.role === "SR_DEVELOPER";
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    // Single job with full details
    if (jobId) {
      if (isSrDeveloper) {
        // SR_DEVELOPER: can see job posting + only interviews they are assigned to
        const job = await prisma.jobPosting.findUnique({
          where: { id: jobId },
          include: {
            candidates: {
              include: {
                reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
                interviews: {
                  where: { interviewerId: user.id },
                  include: {
                    interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
                  },
                  orderBy: { roundNumber: "asc" },
                },
              },
              orderBy: { createdAt: "desc" },
            },
            _count: { select: { candidates: true } },
          },
        });

        if (!job) return jsonError("Job not found", 404);
        return jsonOk({ success: true, data: job });
      }

      // Full management roles: see everything
      const job = await prisma.jobPosting.findUnique({
        where: { id: jobId },
        include: {
          candidates: {
            include: {
              reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
              interviews: {
                include: {
                  interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
                orderBy: { roundNumber: "asc" },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { candidates: true } },
        },
      });

      if (!job) return jsonError("Job not found", 404);
      return jsonOk({ success: true, data: job });
    }

    // All jobs with candidate count
    const department = searchParams.get("department");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (department && department !== "All") where.department = department;
    if (status && status !== "All") where.status = status;

    const jobs = await prisma.jobPosting.findMany({
      where,
      include: { _count: { select: { candidates: true } } },
      orderBy: { createdAt: "desc" },
    });

    const data = jobs.map((j) => ({
      ...j,
      candidateCount: j._count.candidates,
    }));

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

      const { jobId, name, email, phone, resumeUrl, coverLetter, reviewerId } = body;
      if (!jobId || !name || !email) return jsonError("jobId, name, and email are required", 400);

      const job = await prisma.jobPosting.findUnique({ where: { id: jobId } });
      if (!job) return jsonError("Job not found", 404);

      const candidate = await prisma.jobCandidate.create({
        data: {
          jobId,
          name,
          email,
          phone: phone || null,
          resumeUrl: resumeUrl || null,
          coverLetter: coverLetter || null,
          reviewerId: reviewerId || null,
          status: "APPLIED",
        },
        include: {
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      return jsonOk({ success: true, data: candidate }, 201);
    }

    // ── addInterview ───────────────────────────────────────────
    if (action === "addInterview") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only CEO, CTO, Admin, HR, or Product Owner can schedule interviews", 403);
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

      // Verify interviewer exists
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

      // Notify the interviewer about the scheduled interview
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
      // Allow MANAGE_ROLES and SR_DEVELOPER (as interviewer they may submit practical evaluations)
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

      // Check permission: assigned interviewer (including SR_DEVELOPER) or management roles
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

    // ── advanceCandidate ───────────────────────────────────────
    if (action === "advanceCandidate") {
      if (!MANAGE_ROLES.includes(user.role)) {
        return jsonError("Only CEO, CTO, Admin, HR, or Product Owner can advance candidates", 403);
      }

      const { candidateId } = body;
      if (!candidateId) return jsonError("candidateId is required", 400);

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const nextStage = STAGE_ORDER[candidate.status];
      if (!nextStage) return jsonError(`Cannot advance from ${candidate.status}`, 400);

      const updated = await prisma.jobCandidate.update({
        where: { id: candidateId },
        data: { status: nextStage as never },
        include: {
          reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
          interviews: {
            include: {
              interviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { roundNumber: "asc" },
          },
        },
      });

      // Notify the reviewer about candidate advancement
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
        return jsonError("Only CEO, CTO, Admin, HR, or Product Owner can reject candidates", 403);
      }

      const { candidateId, notes } = body;
      if (!candidateId) return jsonError("candidateId is required", 400);

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const updated = await prisma.jobCandidate.update({
        where: { id: candidateId },
        data: {
          status: "REJECTED",
          finalNotes: notes || candidate.finalNotes,
        },
      });

      // Notify the reviewer about candidate rejection
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
        return jsonError("Only CEO, CTO, Admin, HR, or Product Owner can make offers", 403);
      }

      const { candidateId, offeredSalary, notes } = body;
      if (!candidateId) return jsonError("candidateId is required", 400);

      const candidate = await prisma.jobCandidate.findUnique({ where: { id: candidateId } });
      if (!candidate) return jsonError("Candidate not found", 404);

      const updated = await prisma.jobCandidate.update({
        where: { id: candidateId },
        data: {
          status: "OFFERED",
          offeredSalary: offeredSalary ? parseInt(offeredSalary) : null,
          finalNotes: notes || candidate.finalNotes,
        },
      });

      return jsonOk({ success: true, data: updated });
    }

    return jsonError("Invalid action. Use: createJob, addCandidate, addInterview, submitPractical, updateResult, advanceCandidate, rejectCandidate, offerCandidate", 400);
  } catch (error) {
    console.error("Hiring POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/hiring — update job posting
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!MANAGE_ROLES.includes(user.role)) {
      return jsonError("Only CEO, CTO, Admin, HR, or Product Owner can update jobs", 403);
    }

    const body = await req.json();
    const { id, title, department, description, requirements, salaryMin, salaryMax, currency, location, type, status } = body;

    if (!id) return jsonError("Job id is required", 400);

    const job = await prisma.jobPosting.findUnique({ where: { id } });
    if (!job) return jsonError("Job not found", 404);

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (department !== undefined) data.department = department;
    if (description !== undefined) data.description = description;
    if (requirements !== undefined) data.requirements = requirements;
    if (salaryMin !== undefined) {
      const parsed = salaryMin ? parseInt(salaryMin, 10) : null;
      if (parsed !== null && isNaN(parsed)) return jsonError("Invalid salaryMin value", 400);
      data.salaryMin = parsed;
    }
    if (salaryMax !== undefined) {
      const parsed = salaryMax ? parseInt(salaryMax, 10) : null;
      if (parsed !== null && isNaN(parsed)) return jsonError("Invalid salaryMax value", 400);
      data.salaryMax = parsed;
    }
    if (currency !== undefined) data.currency = currency;
    if (location !== undefined) data.location = location;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;

    const updated = await prisma.jobPosting.update({
      where: { id },
      data,
    });

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
      return jsonError("Only CEO, CTO, Admin, HR, or Product Owner can delete records", 403);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) return jsonError("id and type query params are required", 400);

    if (type === "job") {
      const job = await prisma.jobPosting.findUnique({ where: { id } });
      if (!job) return jsonError("Job not found", 404);

      // Delete all interviews for all candidates of this job, then candidates, then job
      const candidateIds = await prisma.jobCandidate.findMany({
        where: { jobId: id },
        select: { id: true },
      });
      if (candidateIds.length > 0) {
        await prisma.interviewRound.deleteMany({
          where: { candidateId: { in: candidateIds.map((c) => c.id) } },
        });
        await prisma.jobCandidate.deleteMany({ where: { jobId: id } });
      }
      await prisma.jobPosting.delete({ where: { id } });
      return jsonOk({ success: true, message: "Job posting and all associated data deleted" });
    }

    if (type === "candidate") {
      const candidate = await prisma.jobCandidate.findUnique({ where: { id } });
      if (!candidate) return jsonError("Candidate not found", 404);

      // Delete interviews first, then the candidate
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
