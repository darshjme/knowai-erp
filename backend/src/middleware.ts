import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(secret);
}

const JWT_SECRET = getJwtSecret();

const PUBLIC_PATHS = ["/", "/login", "/signup", "/careers"];
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/signup", "/api/careers"];

const PROTECTED_PREFIXES = [
  "/dashboard", "/tasks", "/projects", "/team", "/calendar",
  "/chat", "/contacts", "/analytics", "/files", "/notifications",
  "/settings", "/admin", "/api-keys", "/audit", "/webhooks",
  "/profile", "/gantt", "/invoice", "/payroll",
  "/expenses", "/credentials", "/hr", "/sops", "/hiring",
  "/leaves", "/documents", "/reports", "/clients", "/leads",
  "/complaints", "/email", "/canvas", "/goals",
  "/time-tracking", "/activity", "/docs", "/inbox",
  "/spaces", "/onboarding",
];

const AUTH_PAGES = ["/login", "/signup"];

// Common page sets
const COMMON_PAGES = ["/dashboard", "/calendar", "/chat", "/notifications", "/profile", "/settings", "/expenses", "/leaves", "/activity", "/personality-test", "/goals", "/complaints"];
const SENIOR_EXTRA = ["/projects", "/analytics", "/time-tracking", "/docs", "/files", "/email"];
const JUNIOR_BASE = ["/tasks", "/time-tracking", "/docs", "/files"];

// Role-based page access matrix — Know AI roles
const ROLE_ACCESS: Record<string, string[] | null> = {
  // C-Suite: full access
  CEO: null,
  CTO: null,
  CFO: [...COMMON_PAGES, ...SENIOR_EXTRA, "/payroll", "/invoice", "/reports", "/team", "/audit", "/clients", "/leads"],
  BRAND_FACE: [...COMMON_PAGES, ...SENIOR_EXTRA, "/clients", "/leads", "/reports"],

  // Management
  ADMIN: null,
  HR: [...COMMON_PAGES, ...SENIOR_EXTRA, "/team", "/payroll", "/hiring", "/documents", "/hr", "/reports", "/contacts", "/sops", "/onboarding", "/tasks"],
  PRODUCT_OWNER: [...COMMON_PAGES, ...SENIOR_EXTRA, "/tasks", "/clients", "/leads", "/invoice", "/reports", "/team", "/hiring"],
  BRAND_PARTNER: [...COMMON_PAGES, "/clients", "/leads", "/docs", "/files"],

  // Accounting (Senior = full finance, Junior = limited)
  SR_ACCOUNTANT: [...COMMON_PAGES, "/payroll", "/invoice", "/reports", "/docs", "/files", "/email"],
  JR_ACCOUNTANT: [...COMMON_PAGES, "/payroll", "/invoice", "/docs", "/files"],

  // Development (Senior = projects + analytics, Junior = tasks only)
  SR_DEVELOPER: [...COMMON_PAGES, ...SENIOR_EXTRA],
  JR_DEVELOPER: [...COMMON_PAGES, ...JUNIOR_BASE],

  // Design (Senior = projects, Junior = tasks)
  SR_GRAPHIC_DESIGNER: [...COMMON_PAGES, ...SENIOR_EXTRA, "/tasks"],
  JR_GRAPHIC_DESIGNER: [...COMMON_PAGES, ...JUNIOR_BASE],

  // Content & Editorial
  SR_EDITOR: [...COMMON_PAGES, ...SENIOR_EXTRA, "/tasks"],
  JR_EDITOR: [...COMMON_PAGES, ...JUNIOR_BASE],
  SR_CONTENT_STRATEGIST: [...COMMON_PAGES, ...SENIOR_EXTRA, "/tasks"],
  JR_CONTENT_STRATEGIST: [...COMMON_PAGES, ...JUNIOR_BASE],

  // Script Writing
  SR_SCRIPT_WRITER: [...COMMON_PAGES, ...SENIOR_EXTRA, "/tasks"],
  JR_SCRIPT_WRITER: [...COMMON_PAGES, ...JUNIOR_BASE],

  // Brand Strategy
  SR_BRAND_STRATEGIST: [...COMMON_PAGES, ...SENIOR_EXTRA, "/tasks", "/clients", "/leads"],
  JR_BRAND_STRATEGIST: [...COMMON_PAGES, ...JUNIOR_BASE, "/clients"],

  // Operations
  DRIVER: ["/dashboard", "/tasks", "/calendar", "/chat", "/leaves", "/complaints", "/notifications", "/profile", "/settings", "/payroll", "/personality-test", "/goals", "/activity"],

  // General
  GUY: [...COMMON_PAGES, "/tasks", "/files"],
  OFFICE_BOY: ["/dashboard", "/tasks", "/calendar", "/chat",
    "/notifications", "/profile", "/settings", "/leaves", "/activity",
  ],
};

// Cross-cutting APIs accessible to all authenticated users (no page equivalent)
const COMMON_API_PREFIXES = [
  "/api/auth/logout",
  "/api/favorites",
  "/api/chatbot",
  "/api/notifications",
  "/api/settings",
];

// All roles derive API access from page access via ROLE_ACCESS matrix above

// API path -> page path overrides for mismatched names (plural API, singular page)
const API_TO_PAGE_OVERRIDES: Record<string, string> = {
  "/invoices": "/invoice",
};

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/.test(pathname)
  );
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

function isProtectedApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/") && !isPublicApiRoute(pathname);
}

function isRoleAllowed(role: string, pathname: string): boolean {
  const allowed = ROLE_ACCESS[role];
  // null = full access (CEO, CTO, ADMIN)
  if (allowed === null || allowed === undefined) return true;

  if (pathname.startsWith("/api/")) {
    // Cross-cutting APIs accessible to all authenticated users
    if (COMMON_API_PREFIXES.some((p) => pathname.startsWith(p))) {
      return true;
    }

    // Derive API access from page access: /api/tasks → /tasks
    let pagePrefix = "/" + pathname.split("/")[2];

    // Handle mismatched API/page names
    if (API_TO_PAGE_OVERRIDES[pagePrefix]) {
      pagePrefix = API_TO_PAGE_OVERRIDES[pagePrefix];
    }

    return allowed.some((p) => p === pagePrefix || pagePrefix.startsWith(p));
  }

  return allowed.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname)) return NextResponse.next();

  if (PUBLIC_PATHS.includes(pathname)) {
    if (AUTH_PAGES.includes(pathname)) {
      const token = req.cookies.get("token")?.value;
      if (token) {
        try {
          await jwtVerify(token, JWT_SECRET);
          return NextResponse.redirect(new URL("/dashboard", req.url));
        } catch { /* invalid token */ }
      }
    }
    return NextResponse.next();
  }

  if (isPublicApiRoute(pathname)) return NextResponse.next();

  const token = req.cookies.get("token")?.value;

  if (isProtectedApiRoute(pathname)) {
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const role = payload.role as string;

      if (!isRoleAllowed(role, pathname)) {
        return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
      }

      const h = new Headers(req.headers);
      h.set("x-user-id", payload.userId as string);
      h.set("x-user-email", payload.email as string);
      h.set("x-user-role", role);
      if (payload.workspaceId) h.set("x-workspace-id", payload.workspaceId as string);
      h.set("x-token-version", String(payload.tokenVersion ?? 0));
      return NextResponse.next({ request: { headers: h } });
    } catch {
      const r = NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      r.cookies.delete("token");
      return r;
    }
  }

  if (isProtectedRoute(pathname)) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      const role = payload.role as string;

      if (!isRoleAllowed(role, pathname)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      const h = new Headers(req.headers);
      h.set("x-user-id", payload.userId as string);
      h.set("x-user-email", payload.email as string);
      h.set("x-user-role", role);
      if (payload.workspaceId) h.set("x-workspace-id", payload.workspaceId as string);
      h.set("x-token-version", String(payload.tokenVersion ?? 0));
      return NextResponse.next({ request: { headers: h } });
    } catch {
      const r = NextResponse.redirect(new URL("/login", req.url));
      r.cookies.delete("token");
      return r;
    }
  }

  // Safety: strip auth headers on unrecognized routes to prevent header spoofing
  const h = new Headers(req.headers);
  h.delete("x-user-id");
  h.delete("x-user-email");
  h.delete("x-user-role");
  h.delete("x-workspace-id");
  return NextResponse.next({ request: { headers: h } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
