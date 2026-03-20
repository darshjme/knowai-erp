import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import * as crypto from "crypto";

// ── In-memory OTP store (production should use Redis) ──
const otpStore = new Map<string, { code: string; expiresAt: number; verified: boolean; attempts: number }>();

// Rate limiting: track application attempts per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max applications per IP per hour
const RATE_LIMIT_WINDOW = 3600000; // 1 hour

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function checkCareersRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Sanitize input to prevent XSS
function sanitize(str: string | undefined | null): string {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/[<>"'&]/g, "").trim();
}

// Validate email format
function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

// Validate phone format
function isValidPhone(phone: string): boolean {
  return /^\+?[0-9\s\-()]{7,20}$/.test(phone);
}

// Validate URL format
function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GET /api/careers — List open job postings (public, no auth)
// ---------------------------------------------------------------------------
export const GET = createHandler({ public: true }, async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const department = searchParams.get("department") || "";
  const type = searchParams.get("type") || "";
  const sort = searchParams.get("sort") || "newest";

  const where: Record<string, unknown> = { status: "OPEN" };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { department: { contains: search, mode: "insensitive" } },
      { location: { contains: search, mode: "insensitive" } },
    ];
  }
  if (department) where.department = department;
  if (type) where.type = type;

  let orderBy: Record<string, string>;
  switch (sort) {
    case "oldest": orderBy = { createdAt: "asc" }; break;
    case "salary-high": orderBy = { salaryMax: "desc" }; break;
    case "salary-low": orderBy = { salaryMin: "asc" }; break;
    default: orderBy = { createdAt: "desc" };
  }

  const jobs = await prisma.jobPosting.findMany({
    where,
    select: {
      id: true, title: true, department: true, description: true,
      requirements: true, salaryMin: true, salaryMax: true, currency: true,
      location: true, type: true, createdAt: true,
    },
    orderBy,
  });

  const allOpenJobs = await prisma.jobPosting.findMany({
    where: { status: "OPEN" },
    select: { department: true, type: true },
  });

  const departments = Array.from(new Set(allOpenJobs.map((j) => j.department).filter((d): d is string => !!d))).sort();
  const types = Array.from(new Set(allOpenJobs.map((j) => j.type).filter((t): t is string => !!t))).sort();

  return NextResponse.json({ jobs, departments, types });
});

// ---------------------------------------------------------------------------
// POST /api/careers — Submit application or request/verify OTP (public)
//   action: "send-otp" | "verify-otp" | "apply"
// ---------------------------------------------------------------------------
export const POST = createHandler({ public: true, rateLimit: "write" }, async (req: NextRequest) => {
  const ip = getClientIp(req);
  if (!checkCareersRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = await req.json();
  const { action } = body;

  // ── Send OTP ──
  if (action === "send-otp") {
    const email = sanitize(body.email)?.toLowerCase();
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email address is required" }, { status: 400 });
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email, { code, expiresAt, verified: false, attempts: 0 });

    // In production, send via email. For now, log and return masked hint.
    console.log(`[OTP] ${email}: ${code}`);

    // Try to send email if SMTP is configured
    try {
      const { default: nodemailer } = await import("nodemailer");
      const smtpConfig = await prisma.systemConfig.findUnique({ where: { key: "smtp" } });
      if (smtpConfig) {
        const smtp = JSON.parse(smtpConfig.value);
        if (smtp.host && smtp.user && smtp.pass) {
          const transport = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port || 587,
            secure: smtp.secure || false,
            auth: { user: smtp.user, pass: smtp.pass },
          });
          await transport.sendMail({
            from: `"Know AI Careers" <${smtp.fromEmail || smtp.user}>`,
            to: email,
            subject: "Your Verification Code — Know AI",
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
                <h2 style="color:#1e293b">Verify Your Email</h2>
                <p style="color:#475569">Your verification code for Know AI job application:</p>
                <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:24px;background:#f1f5f9;border-radius:12px;color:#1e293b">${code}</div>
                <p style="color:#94a3b8;font-size:13px;margin-top:16px">This code expires in 10 minutes. If you didn't request this, please ignore.</p>
              </div>
            `,
          });
        }
      }
    } catch (emailErr) {
      console.error("[OTP Email Error]", emailErr);
      // OTP still stored in memory, user can check console in dev
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      // In dev mode, include hint
      ...(process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
    });
  }

  // ── Verify OTP ──
  if (action === "verify-otp") {
    const email = sanitize(body.email)?.toLowerCase();
    const code = sanitize(body.code);

    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const stored = otpStore.get(email);
    if (!stored) {
      return NextResponse.json({ error: "No verification code found. Please request a new one." }, { status: 400 });
    }
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return NextResponse.json({ error: "Verification code expired. Please request a new one." }, { status: 400 });
    }
    // Brute-force protection: max 5 attempts per OTP
    if (stored.attempts >= 5) {
      otpStore.delete(email);
      return NextResponse.json({ error: "Too many failed attempts. Please request a new code." }, { status: 429 });
    }

    if (stored.code !== code) {
      stored.attempts++;
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    stored.verified = true;
    return NextResponse.json({ success: true, message: "Email verified successfully" });
  }

  // ── Submit Application ──
  // Reject unknown explicit actions
  if (action && action !== "apply") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { jobId, name, email, phone, whatsappNumber, resumeUrl, linkedinUrl, portfolioUrl, coverLetter } = body;

  // Validate required fields
  const cleanName = sanitize(name);
  const cleanEmail = sanitize(email)?.toLowerCase();

  if (!jobId || !cleanName || !cleanEmail) {
    return NextResponse.json({ error: "Job, name, and email are required" }, { status: 400 });
  }

  if (cleanName.length < 2 || cleanName.length > 100) {
    return NextResponse.json({ error: "Name must be 2-100 characters" }, { status: 400 });
  }

  if (!isValidEmail(cleanEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Verify email was OTP-verified
  const otpEntry = otpStore.get(cleanEmail);
  if (!otpEntry || !otpEntry.verified) {
    return NextResponse.json({ error: "Please verify your email address first" }, { status: 400 });
  }

  // Validate optional fields
  const cleanPhone = sanitize(phone);
  const cleanWhatsapp = sanitize(whatsappNumber);
  const cleanResume = sanitize(resumeUrl);
  const cleanLinkedin = sanitize(linkedinUrl);
  const cleanPortfolio = sanitize(portfolioUrl);
  const cleanCoverLetter = sanitize(coverLetter)?.slice(0, 5000);

  if (cleanPhone && !isValidPhone(cleanPhone)) {
    return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 });
  }
  if (cleanWhatsapp && !isValidPhone(cleanWhatsapp)) {
    return NextResponse.json({ error: "Invalid WhatsApp number format" }, { status: 400 });
  }
  if (cleanResume && !isValidUrl(cleanResume)) {
    return NextResponse.json({ error: "Resume URL must be a valid URL (Google Drive, Dropbox, etc.)" }, { status: 400 });
  }
  if (cleanLinkedin && !isValidUrl(cleanLinkedin)) {
    return NextResponse.json({ error: "LinkedIn URL must be a valid URL" }, { status: 400 });
  }
  if (cleanPortfolio && !isValidUrl(cleanPortfolio)) {
    return NextResponse.json({ error: "Portfolio URL must be a valid URL" }, { status: 400 });
  }

  // Check job exists and is OPEN
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, title: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.status !== "OPEN") {
    return NextResponse.json({ error: "This job is no longer accepting applications" }, { status: 400 });
  }

  // Check duplicate
  const existing = await prisma.jobCandidate.findFirst({ where: { jobId, email: cleanEmail } });
  if (existing) {
    return NextResponse.json({ error: "You have already applied to this position" }, { status: 409 });
  }

  // Create application
  await prisma.jobCandidate.create({
    data: {
      jobId,
      name: cleanName,
      email: cleanEmail,
      emailVerified: true,
      phone: cleanPhone || null,
      whatsappNumber: cleanWhatsapp || null,
      resumeUrl: cleanResume || null,
      linkedinUrl: cleanLinkedin || null,
      portfolioUrl: cleanPortfolio || null,
      coverLetter: cleanCoverLetter || null,
      status: "APPLIED",
    },
  });

  // Clean up OTP
  otpStore.delete(cleanEmail);

  return NextResponse.json({ message: "Application submitted successfully" }, { status: 201 });
});
