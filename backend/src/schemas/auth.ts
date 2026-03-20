import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  workspaceId: z.string().uuid().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

// All 25 valid roles in the system
const VALID_ROLES = [
  "CEO", "CTO", "CFO", "BRAND_FACE", "ADMIN", "HR",
  "PRODUCT_OWNER", "BRAND_PARTNER",
  "SR_ACCOUNTANT", "JR_ACCOUNTANT",
  "SR_DEVELOPER", "JR_DEVELOPER",
  "SR_GRAPHIC_DESIGNER", "JR_GRAPHIC_DESIGNER",
  "SR_EDITOR", "JR_EDITOR",
  "SR_CONTENT_STRATEGIST", "JR_CONTENT_STRATEGIST",
  "SR_SCRIPT_WRITER", "JR_SCRIPT_WRITER",
  "SR_BRAND_STRATEGIST", "JR_BRAND_STRATEGIST",
  "DRIVER", "GUY", "OFFICE_BOY",
] as const;

export const adminCreateUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  role: z.enum(VALID_ROLES).optional(),
  designation: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  salary: z.number().optional().nullable(),
  reportingTo: z.string().optional().nullable(),
  workspaceId: z.string().uuid().optional(),
});

export const forgotPasswordSchema = z.object({
  action: z.enum(["findAccount", "verifyIdentity", "resetPassword", "lookupEmail"]),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  userId: z.string().optional(),
  verificationCode: z.string().optional(),
  resetToken: z.string().optional(),
  newPassword: z.string().optional(),
});

export const twoFactorActionSchema = z.object({
  action: z.enum(["enable", "disable"]),
});
