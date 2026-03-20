import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { getRoleContext } from "@/lib/roles";
import { loginSchema } from "@/schemas/auth";
import { logAudit } from "@/lib/audit";

// ── Rate limiting for brute-force protection ──
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5; // max failed attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15-minute sliding window

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry) return { allowed: true };

  // Currently blocked
  if (entry.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  // Reset if window expired
  if (now - entry.blockedUntil > ATTEMPT_WINDOW) {
    loginAttempts.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry) {
    loginAttempts.set(key, { count: 1, blockedUntil: 0 });
    return;
  }

  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + LOCKOUT_DURATION;
    entry.count = 0; // reset count for next window
  }
}

function clearFailedAttempts(key: string): void {
  loginAttempts.delete(key);
}

// Periodic cleanup of expired entries (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (entry.blockedUntil > 0 && now - entry.blockedUntil > ATTEMPT_WINDOW) {
      loginAttempts.delete(key);
    }
  }
}, 10 * 60 * 1000);

const isProduction = process.env.NODE_ENV === "production";

export const POST = createHandler(
  { public: true, schema: loginSchema },
  async (req, { body }) => {
    const ip = getClientIp(req as NextRequest);
    const { email, password } = body;

    // Rate limit by both IP and email to prevent distributed brute-force
    const ipCheck = checkLoginRateLimit(`ip:${ip}`);
    const emailCheck = checkLoginRateLimit(`email:${email.toLowerCase()}`);

    if (!ipCheck.allowed) {
      return jsonError(
        "Too many login attempts. Please try again later.",
        429
      );
    }
    if (!emailCheck.allowed) {
      return jsonError(
        "Too many login attempts for this account. Please try again later.",
        429
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        workspace: true,
        preferences: true,
      },
    });

    if (!user) {
      recordFailedAttempt(`ip:${ip}`);
      recordFailedAttempt(`email:${email.toLowerCase()}`);
      return jsonError("Invalid email or password", 401);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      recordFailedAttempt(`ip:${ip}`);
      recordFailedAttempt(`email:${email.toLowerCase()}`);
      return jsonError("Invalid email or password", 401);
    }

    // Check if account is already disabled
    if (user.accountDisabled) {
      return jsonError("Your account has been disabled due to incomplete profile. Contact HR.", 403);
    }

    // Check profile deadline — if past deadline and profile not complete, disable account
    if (user.profileDeadline && !user.profileComplete && new Date() > new Date(user.profileDeadline)) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          accountDisabled: true,
          accountDisabledAt: new Date(),
          disableReason: "Profile not completed within 14-day deadline",
        },
      });
      return jsonError("Your account has been disabled due to incomplete profile. Contact HR.", 403);
    }

    // Successful login — clear failed attempt counters
    clearFailedAttempts(`ip:${ip}`);
    clearFailedAttempts(`email:${email.toLowerCase()}`);

    // Update status to ONLINE and record last login
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "ONLINE" },
    });

    // JWT payload includes userId, email, role, workspaceId, and tokenVersion
    // tokenVersion is checked on each request — if the DB version is higher
    // (e.g., after a role change), this JWT is rejected as stale.
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
      tokenVersion: user.tokenVersion ?? 0,
    });

    // Build full profile response (strip sensitive fields)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      password: _,
      twoFactorSecret: _tfs,
      secretAnswer: _sa,
      passwordResetToken: _prt,
      passwordResetExpiry: _pre,
      passwordHistory: _ph,
      ...userWithoutPassword
    } = user;

    // Resolve role context from single source of truth (lib/roles.ts)
    const roleContext = getRoleContext(user.role);

    const response = jsonOk({
      success: true,
      data: {
        user: {
          ...userWithoutPassword,
          onboardingComplete: user.onboardingComplete,
          profileComplete: user.profileComplete,
          profileDeadline: user.profileDeadline,
          ...roleContext,
        },
      },
    });

    // Audit log: user login
    logAudit({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: "LOGIN",
      entity: "USER",
      entityId: user.id,
      entityName: `${user.firstName} ${user.lastName}`,
      description: `User ${user.firstName} ${user.lastName} logged in`,
      workspaceId: user.workspaceId,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  }
);
