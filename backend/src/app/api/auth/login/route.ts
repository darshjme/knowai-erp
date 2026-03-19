import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-utils";
import { getRoleContext } from "@/lib/roles";

// ── Role-based permission definitions ──
const ROLE_PERMISSIONS: Record<string, string[]> = {
  CEO: [
    "all:read", "all:write", "all:delete", "all:manage",
    "users:manage", "roles:assign", "workspace:manage", "finance:full",
    "reports:all", "settings:manage", "credentials:all", "complaints:all",
    "hiring:manage", "payroll:manage", "audit:read",
  ],
  CTO: [
    "all:read", "projects:manage", "tasks:manage", "users:read",
    "workspace:manage", "credentials:tech", "reports:tech",
    "hiring:manage", "settings:tech", "audit:read",
  ],
  CFO: [
    "all:read", "finance:full", "payroll:manage", "expenses:manage",
    "invoices:manage", "reports:finance", "audit:read",
    "credentials:finance",
  ],
  BRAND_FACE: [
    "projects:read", "tasks:read", "clients:manage", "leads:manage",
    "contacts:manage", "calendar:manage", "reports:marketing",
  ],
  ADMIN: [
    "all:read", "all:write", "users:manage", "roles:assign",
    "workspace:manage", "settings:manage", "credentials:all",
    "audit:read", "hiring:manage", "payroll:read",
  ],
  HR: [
    "users:manage", "users:read", "payroll:manage", "leaves:manage",
    "documents:manage", "hiring:manage", "complaints:manage",
    "reports:hr", "audit:read",
  ],
  ACCOUNTING: [
    "finance:read", "payroll:read", "expenses:manage", "invoices:manage",
    "reports:finance", "credentials:finance",
  ],
  PRODUCT_OWNER: [
    "projects:manage", "tasks:manage", "clients:read", "leads:read",
    "reports:projects", "goals:manage", "spaces:manage", "docs:manage",
  ],
  CONTENT_STRATEGIST: [
    "projects:read", "tasks:own", "docs:manage", "calendar:manage",
    "canvas:manage", "files:manage",
  ],
  BRAND_PARTNER: [
    "projects:read", "tasks:read", "clients:read", "leads:read",
    "reports:read", "contacts:read",
  ],
  SR_DEVELOPER: [
    "projects:read", "tasks:own", "docs:manage", "canvas:manage",
    "files:manage", "time:own", "credentials:tech",
  ],
  EDITOR: [
    "projects:read", "tasks:own", "docs:manage", "canvas:manage",
    "files:manage", "time:own",
  ],
  GRAPHIC_DESIGNER: [
    "projects:read", "tasks:own", "canvas:manage", "files:manage",
    "time:own",
  ],
  JR_DEVELOPER: [
    "projects:read", "tasks:own", "docs:read", "files:read",
    "time:own",
  ],
  GUY: [
    "tasks:own", "time:own", "docs:read", "files:read",
    "calendar:read",
  ],
  OFFICE_BOY: [
    "tasks:own", "time:own", "calendar:read",
  ],
};

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

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { email, password } = await req.json();

    if (!email || !password) {
      return jsonError("Email and password are required", 400);
    }

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

    // Build full profile response (strip password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

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

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return jsonError("Internal server error", 500);
  }
}
