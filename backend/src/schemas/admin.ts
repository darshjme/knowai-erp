import { z } from "zod";

// ─── Admin PUT schemas ──────────────────────────────────────────────────────

const validRoles = [
  "CEO", "CTO", "CFO", "BRAND_FACE", "ADMIN", "HR", "PRODUCT_OWNER",
  "BRAND_PARTNER", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "SR_DEVELOPER",
  "JR_DEVELOPER", "SR_GRAPHIC_DESIGNER", "JR_GRAPHIC_DESIGNER", "SR_EDITOR",
  "JR_EDITOR", "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST",
  "SR_SCRIPT_WRITER", "JR_SCRIPT_WRITER", "SR_BRAND_STRATEGIST",
  "JR_BRAND_STRATEGIST", "DRIVER", "GUY", "OFFICE_BOY",
] as const;

const validStatuses = ["ONLINE", "AWAY", "OFFLINE"] as const;

// Generic section-based body — the PUT handler dispatches on `section`
export const adminPutSchema = z.object({
  section: z.string(),
  // All other fields are optional and section-dependent
  data: z.record(z.string(), z.unknown()).optional(),
  integration: z.string().optional(),
  userId: z.string().optional(),
  role: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  password: z.string().optional(),
  newPassword: z.string().optional(),
  userIds: z.array(z.string()).optional(),
}).passthrough();

export const adminPatchSchema = z.object({
  action: z.enum(["toggle-maintenance", "toggle-signup"]),
});

// ─── Admin Config schemas ───────────────────────────────────────────────────

export const adminConfigPostSchema = z.object({
  action: z.string().optional(),
  configs: z.record(z.string(), z.string()).optional(),
}).passthrough();

// ─── HR schemas ─────────────────────────────────────────────────────────────

export const hrLeaveActionSchema = z.object({
  leaveId: z.string().min(1, "leaveId is required"),
  action: z.enum(["approve", "reject"]),
});

// ─── HR Password Management schemas ─────────────────────────────────────────

export const passwordManagementSchema = z.object({
  action: z.enum(["resetPassword", "unlockAccount", "forceChangePassword"]),
  userId: z.string().min(1, "userId is required"),
});

// ─── Team schemas ───────────────────────────────────────────────────────────

export const teamCreateSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  phone: z.string().optional(),
});

export const teamPatchSchema = z.object({
  id: z.string().min(1, "Member ID is required"),
  role: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
});

// ─── Audit schemas ──────────────────────────────────────────────────────────

export const auditRollbackSchema = z.object({
  logId: z.string().min(1, "Log ID is required"),
});
