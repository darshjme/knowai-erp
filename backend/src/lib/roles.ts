/**
 * Role permissions — single source of truth for the entire application.
 *
 * Backend middleware uses this to check API access.
 * Frontend receives the user's permissions in the login response
 * and stores them in Redux for sidebar/widget visibility.
 *
 * To add a new role: add it to the UserRole enum in schema.prisma,
 * then add its permissions and sidebar access here.
 */

// ─── Permission Definitions ─────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<string, string[]> = {
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
    "invoices:manage", "reports:finance", "audit:read", "credentials:finance",
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
  PRODUCT_OWNER: [
    "projects:manage", "tasks:manage", "clients:read", "leads:read",
    "reports:projects", "goals:manage", "spaces:manage", "docs:manage",
  ],
  BRAND_PARTNER: [
    "projects:read", "tasks:read", "clients:read", "leads:read",
    "reports:read", "contacts:read",
  ],
  SR_ACCOUNTANT: [
    "finance:read", "payroll:read", "expenses:manage", "invoices:manage",
    "reports:finance", "credentials:finance",
  ],
  JR_ACCOUNTANT: [
    "finance:read", "payroll:read", "invoices:read",
  ],
  SR_DEVELOPER: [
    "projects:read", "tasks:own", "docs:manage", "canvas:manage",
    "files:manage", "time:own", "credentials:tech",
  ],
  JR_DEVELOPER: [
    "projects:read", "tasks:own", "docs:read", "files:read", "time:own",
  ],
  SR_GRAPHIC_DESIGNER: [
    "projects:read", "tasks:own", "canvas:manage", "files:manage", "time:own",
  ],
  JR_GRAPHIC_DESIGNER: [
    "projects:read", "tasks:own", "canvas:manage", "files:read", "time:own",
  ],
  SR_EDITOR: [
    "projects:read", "tasks:own", "docs:manage", "canvas:manage",
    "files:manage", "time:own",
  ],
  JR_EDITOR: [
    "projects:read", "tasks:own", "docs:read", "files:read", "time:own",
  ],
  SR_CONTENT_STRATEGIST: [
    "projects:read", "tasks:own", "docs:manage", "canvas:manage",
    "files:manage", "time:own",
  ],
  JR_CONTENT_STRATEGIST: [
    "projects:read", "tasks:own", "docs:read", "files:read", "time:own",
  ],
  SR_SCRIPT_WRITER: [
    "projects:read", "tasks:own", "docs:manage", "files:manage", "time:own",
  ],
  JR_SCRIPT_WRITER: [
    "projects:read", "tasks:own", "docs:read", "files:read", "time:own",
  ],
  SR_BRAND_STRATEGIST: [
    "projects:read", "tasks:own", "clients:read", "leads:read",
    "docs:manage", "files:manage", "time:own",
  ],
  JR_BRAND_STRATEGIST: [
    "projects:read", "tasks:own", "clients:read", "docs:read",
    "files:read", "time:own",
  ],
  DRIVER: ["tasks:own", "time:own", "calendar:read"],
  GUY: ["tasks:own", "time:own", "docs:read", "files:read", "calendar:read"],
  OFFICE_BOY: ["tasks:own", "time:own", "calendar:read"],
};

// ─── Sidebar Access (consumed by frontend via login response) ───────────────

const COMMON = [
  "dashboard", "calendar", "chat", "notifications", "settings",
  "expenses", "leaves", "personality-test", "goals", "complaints",
];
const SENIOR_EXTRA = [
  "projects", "analytics", "time-tracking", "docs", "files", "email",
];
const JUNIOR_BASE = ["tasks", "time-tracking", "docs", "files"];

export const ROLE_SIDEBAR_ACCESS: Record<string, string[] | null> = {
  CEO: null, // null = full access
  CTO: null,
  ADMIN: null,
  CFO: [...COMMON, ...SENIOR_EXTRA, "payroll", "invoices", "reports", "team", "audit", "clients", "leads", "tasks", "hr-dashboard", "hiring", "documents", "admin"],
  BRAND_FACE: [...COMMON, ...SENIOR_EXTRA, "clients", "leads", "reports"],
  HR: [...COMMON, ...SENIOR_EXTRA, "tasks", "team", "payroll", "hiring", "documents", "hr-dashboard", "reports", "onboarding"],
  PRODUCT_OWNER: [...COMMON, ...SENIOR_EXTRA, "tasks", "clients", "leads", "invoices", "reports", "team", "hiring"],
  BRAND_PARTNER: [...COMMON, "clients", "leads", "docs", "files"],
  SR_ACCOUNTANT: [...COMMON, "payroll", "invoices", "reports", "docs", "files", "email"],
  JR_ACCOUNTANT: [...COMMON, "payroll", "invoices", "docs", "files"],
  SR_DEVELOPER: [...COMMON, ...SENIOR_EXTRA, "tasks"],
  JR_DEVELOPER: [...COMMON, ...JUNIOR_BASE],
  SR_GRAPHIC_DESIGNER: [...COMMON, ...SENIOR_EXTRA, "tasks"],
  JR_GRAPHIC_DESIGNER: [...COMMON, ...JUNIOR_BASE],
  SR_EDITOR: [...COMMON, ...SENIOR_EXTRA, "tasks"],
  JR_EDITOR: [...COMMON, ...JUNIOR_BASE],
  SR_CONTENT_STRATEGIST: [...COMMON, ...SENIOR_EXTRA, "tasks"],
  JR_CONTENT_STRATEGIST: [...COMMON, ...JUNIOR_BASE],
  SR_SCRIPT_WRITER: [...COMMON, ...SENIOR_EXTRA, "tasks"],
  JR_SCRIPT_WRITER: [...COMMON, ...JUNIOR_BASE],
  SR_BRAND_STRATEGIST: [...COMMON, ...SENIOR_EXTRA, "tasks", "clients", "leads"],
  JR_BRAND_STRATEGIST: [...COMMON, ...JUNIOR_BASE, "clients"],
  DRIVER: ["dashboard", "tasks", "calendar", "chat", "leaves", "complaints", "notifications", "settings", "payroll", "personality-test", "goals"],
  GUY: [...COMMON, "tasks", "files"],
  OFFICE_BOY: ["dashboard", "tasks", "calendar", "chat", "notifications", "settings", "leaves"],
};

// ─── Dashboard Widget Access ────────────────────────────────────────────────

export const ROLE_DASHBOARD_WIDGETS: Record<string, string[] | null> = {
  CEO: null,
  CTO: null,
  ADMIN: null,
  CFO: ["revenue", "expenses", "revenueChart", "deadlines"],
  HR: ["team", "leaves", "recentActivity", "deadlines"],
  PRODUCT_OWNER: ["projects", "tasks", "deadlines", "recentActivity"],
  SR_DEVELOPER: ["tasks", "projects", "deadlines"],
  JR_DEVELOPER: ["tasks", "deadlines"],
  BRAND_FACE: ["projects", "clients", "leads", "deadlines"],
  BRAND_PARTNER: ["projects", "clients", "deadlines"],
  SR_ACCOUNTANT: ["revenue", "expenses", "deadlines"],
  JR_ACCOUNTANT: ["expenses", "deadlines"],
  DRIVER: ["tasks", "deadlines"],
  GUY: ["tasks", "deadlines"],
  OFFICE_BOY: ["tasks", "deadlines"],
};

// ─── Helper Functions ───────────────────────────────────────────────────────

/** Check if a role has a specific permission */
export function hasPermission(role: string, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes("all:read") && permission.endsWith(":read")) return true;
  if (perms.includes("all:write") && permission.endsWith(":write")) return true;
  if (perms.includes("all:delete") && permission.endsWith(":delete")) return true;
  if (perms.includes("all:manage") && permission.endsWith(":manage")) return true;
  return perms.includes(permission);
}

/** Check if a role can access a sidebar page */
export function hasPageAccess(role: string, page: string): boolean {
  const access = ROLE_SIDEBAR_ACCESS[role];
  if (access === null || access === undefined) return true;
  return access.includes(page);
}

/** Check if a role is C-level or senior */
export function isSenior(role: string): boolean {
  return role === "CEO" || role === "CTO" || role === "CFO" || role.startsWith("SR_") || role === "ADMIN";
}

/** Get the full role context for a login response */
export function getRoleContext(role: string) {
  return {
    permissions: ROLE_PERMISSIONS[role] || [],
    sidebarAccess: ROLE_SIDEBAR_ACCESS[role],
    dashboardWidgets: ROLE_DASHBOARD_WIDGETS[role],
  };
}
