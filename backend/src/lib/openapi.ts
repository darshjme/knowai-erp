import { createDocument } from "zod-openapi";
import { z } from "zod";

// Import all schemas
import { loginSchema, signupSchema, changePasswordSchema, adminCreateUserSchema, forgotPasswordSchema, twoFactorActionSchema } from "@/schemas/auth";
import { createExpenseSchema, updateExpenseSchema } from "@/schemas/expenses";
import { createPayrollSchema, addPayrollLogSchema, updatePayrollSchema } from "@/schemas/payroll";
import { createJobSchema, createCandidateSchema, rateCandidateSchema, addCandidateCommentSchema } from "@/schemas/hiring";
import { createInvoiceSchema, updateInvoiceSchema } from "@/schemas/invoices";
import { createTaskSchema, updateTaskSchema } from "@/schemas/tasks";
import { onboardingCompleteSchema, onboardingSaveProgressSchema } from "@/schemas/onboarding";

// Common response schemas
const errorResponse = z.object({
  error: z.string(),
});

const successResponse = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
});

const validationErrorResponse = z.object({
  error: z.literal("Validation failed"),
  issues: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })),
});

export function generateOpenApiSpec() {
  return createDocument({
    openapi: "3.1.0",
    info: {
      title: "KnowAI ERP API",
      version: "1.0.0",
      description: "Internal ERP API for KnowAI — managing HR, hiring, payroll, projects, content review, and team communication.",
      contact: {
        name: "KnowAI Team",
        url: "https://crm.knowai.club",
      },
    },
    servers: [
      { url: "https://crm.knowai.club", description: "Production" },
      { url: "http://localhost:3000", description: "Local development" },
    ],
    paths: {
      // ── Auth ──
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login with email and password",
          requestBody: { content: { "application/json": { schema: loginSchema } } },
          responses: {
            "200": { description: "Login successful", content: { "application/json": { schema: successResponse } } },
            "401": { description: "Invalid credentials", content: { "application/json": { schema: errorResponse } } },
            "429": { description: "Too many login attempts", content: { "application/json": { schema: errorResponse } } },
          },
        },
      },
      "/api/auth/signup": {
        post: {
          tags: ["Auth"],
          summary: "Create a new user (admin/HR only)",
          requestBody: { content: { "application/json": { schema: adminCreateUserSchema } } },
          responses: {
            "201": { description: "User created", content: { "application/json": { schema: successResponse } } },
            "403": { description: "Insufficient permissions", content: { "application/json": { schema: errorResponse } } },
            "409": { description: "Email already in use", content: { "application/json": { schema: errorResponse } } },
          },
        },
      },
      "/api/auth/change-password": {
        post: {
          tags: ["Auth"],
          summary: "Change current user's password",
          requestBody: { content: { "application/json": { schema: changePasswordSchema } } },
          responses: {
            "200": { description: "Password changed", content: { "application/json": { schema: successResponse } } },
            "401": { description: "Current password incorrect", content: { "application/json": { schema: errorResponse } } },
          },
        },
      },
      "/api/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Forgot password flow (find account, verify, reset)",
          requestBody: { content: { "application/json": { schema: forgotPasswordSchema } } },
          responses: {
            "200": { description: "Action completed", content: { "application/json": { schema: successResponse } } },
          },
        },
      },
      "/api/auth/two-factor": {
        post: {
          tags: ["Auth"],
          summary: "Enable or disable 2FA",
          requestBody: { content: { "application/json": { schema: twoFactorActionSchema } } },
          responses: {
            "200": { description: "2FA updated", content: { "application/json": { schema: successResponse } } },
          },
        },
      },

      // ── Expenses ──
      "/api/expenses": {
        get: {
          tags: ["Expenses"],
          summary: "List expenses (scoped by role)",
          responses: { "200": { description: "Expense list", content: { "application/json": { schema: successResponse } } } },
        },
        post: {
          tags: ["Expenses"],
          summary: "Create a new expense",
          requestBody: { content: { "application/json": { schema: createExpenseSchema } } },
          responses: {
            "201": { description: "Expense created", content: { "application/json": { schema: successResponse } } },
            "400": { description: "Validation error", content: { "application/json": { schema: validationErrorResponse } } },
          },
        },
        patch: {
          tags: ["Expenses"],
          summary: "Update or approve/reject an expense",
          requestBody: { content: { "application/json": { schema: updateExpenseSchema } } },
          responses: { "200": { description: "Expense updated", content: { "application/json": { schema: successResponse } } } },
        },
      },

      // ── Payroll ──
      "/api/payroll": {
        get: {
          tags: ["Payroll"],
          summary: "List payroll records",
          responses: { "200": { description: "Payroll list", content: { "application/json": { schema: successResponse } } } },
        },
        post: {
          tags: ["Payroll"],
          summary: "Create payroll or add payment log",
          requestBody: { content: { "application/json": { schema: createPayrollSchema } } },
          responses: { "201": { description: "Payroll created", content: { "application/json": { schema: successResponse } } } },
        },
        patch: {
          tags: ["Payroll"],
          summary: "Update payroll record",
          requestBody: { content: { "application/json": { schema: updatePayrollSchema } } },
          responses: { "200": { description: "Payroll updated", content: { "application/json": { schema: successResponse } } } },
        },
      },

      // ── Invoices ──
      "/api/invoices": {
        get: {
          tags: ["Invoices"],
          summary: "List invoices",
          responses: { "200": { description: "Invoice list", content: { "application/json": { schema: successResponse } } } },
        },
        post: {
          tags: ["Invoices"],
          summary: "Create a new invoice",
          requestBody: { content: { "application/json": { schema: createInvoiceSchema } } },
          responses: { "201": { description: "Invoice created", content: { "application/json": { schema: successResponse } } } },
        },
        patch: {
          tags: ["Invoices"],
          summary: "Update an invoice",
          requestBody: { content: { "application/json": { schema: updateInvoiceSchema } } },
          responses: { "200": { description: "Invoice updated", content: { "application/json": { schema: successResponse } } } },
        },
      },

      // ── Tasks ──
      "/api/tasks": {
        get: {
          tags: ["Tasks"],
          summary: "List tasks (filterable by status, project, assignee)",
          responses: { "200": { description: "Task list", content: { "application/json": { schema: successResponse } } } },
        },
        post: {
          tags: ["Tasks"],
          summary: "Create a new task",
          requestBody: { content: { "application/json": { schema: createTaskSchema } } },
          responses: { "201": { description: "Task created", content: { "application/json": { schema: successResponse } } } },
        },
        patch: {
          tags: ["Tasks"],
          summary: "Update a task",
          requestBody: { content: { "application/json": { schema: updateTaskSchema } } },
          responses: { "200": { description: "Task updated", content: { "application/json": { schema: successResponse } } } },
        },
      },

      // ── Hiring ──
      "/api/hiring": {
        get: {
          tags: ["Hiring"],
          summary: "List jobs, candidates, and interviews",
          responses: { "200": { description: "Hiring data", content: { "application/json": { schema: successResponse } } } },
        },
        post: {
          tags: ["Hiring"],
          summary: "Create job, candidate, rating, or comment",
          requestBody: { content: { "application/json": { schema: createJobSchema } } },
          responses: { "201": { description: "Created", content: { "application/json": { schema: successResponse } } } },
        },
      },

      // ── Onboarding ──
      "/api/onboarding": {
        get: {
          tags: ["Onboarding"],
          summary: "Get onboarding progress and saved fields",
          responses: { "200": { description: "Onboarding status", content: { "application/json": { schema: successResponse } } } },
        },
        patch: {
          tags: ["Onboarding"],
          summary: "Save wizard progress (per step)",
          requestBody: { content: { "application/json": { schema: onboardingSaveProgressSchema } } },
          responses: { "200": { description: "Progress saved", content: { "application/json": { schema: successResponse } } } },
        },
        post: {
          tags: ["Onboarding"],
          summary: "Complete onboarding (with file uploads)",
          requestBody: { content: { "multipart/form-data": { schema: onboardingCompleteSchema } } },
          responses: { "200": { description: "Onboarding completed", content: { "application/json": { schema: successResponse } } } },
        },
      },

      // ── Admin ──
      "/api/admin/onboarding-status": {
        get: {
          tags: ["Admin"],
          summary: "Get all users' onboarding status (HR/Admin only)",
          responses: { "200": { description: "Onboarding status list", content: { "application/json": { schema: successResponse } } } },
        },
      },

      // ── Health ──
      "/api/health": {
        get: {
          tags: ["System"],
          summary: "Health check",
          responses: { "200": { description: "Service healthy", content: { "application/json": { schema: z.object({ status: z.string() }) } } } },
        },
      },
    },
  });
}
