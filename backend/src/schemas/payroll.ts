import { z } from "zod";

export const createPayrollSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  basicPay: z.number().int().min(0, "Basic pay cannot be negative"),
  hra: z.number().int().min(0).default(0),
  transport: z.number().int().min(0).default(0),
  bonus: z.number().int().min(0).default(0),
  deductions: z.number().int().min(0).default(0),
  totalPay: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  workingDays: z.number().int().min(0).max(31).default(22),
  presentDays: z.number().int().min(0).max(31).default(0),
  absentDays: z.number().int().min(0).max(31).default(0),
  leaveDays: z.number().int().min(0).max(31).default(0),
});

export const addPayrollLogSchema = z.object({
  action: z.literal("addLog"),
  payrollId: z.string().uuid("Invalid payroll ID"),
  amount: z.number().int().positive("Amount must be positive"),
  mode: z.enum(["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"]),
  purpose: z.string().min(1, "Purpose is required"),
  bankRef: z.string().optional(),
  remarks: z.string().optional(),
});

export const updatePayrollSchema = z.object({
  id: z.string().uuid("Invalid payroll ID"),
  basicPay: z.number().int().min(0).optional(),
  hra: z.number().int().min(0).optional(),
  transport: z.number().int().min(0).optional(),
  bonus: z.number().int().min(0).optional(),
  deductions: z.number().int().min(0).optional(),
  totalPay: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  workingDays: z.number().int().min(0).max(31).optional(),
  presentDays: z.number().int().min(0).max(31).optional(),
  absentDays: z.number().int().min(0).max(31).optional(),
  leaveDays: z.number().int().min(0).max(31).optional(),
  status: z.enum(["PENDING", "PAID", "FAILED", "CANCELLED"]).optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
});
