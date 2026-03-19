import { z } from "zod";

export const createExpenseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  amount: z.number().int().positive("Amount must be positive"),
  category: z.enum([
    "TRAVEL", "FOOD", "EQUIPMENT", "SOFTWARE", "OFFICE",
    "SHOOT", "MARKETING", "FUEL", "MAINTENANCE", "OTHER",
  ]),
  receipt: z.string().optional(),
  currency: z.string().default("INR"),
  expenseDate: z.string().datetime().optional(),
});

export const updateExpenseSchema = z.object({
  id: z.string().uuid("Invalid expense ID"),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "REIMBURSED"]).optional(),
  rejectNote: z.string().max(1000).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  amount: z.number().int().positive().optional(),
  category: z.enum([
    "TRAVEL", "FOOD", "EQUIPMENT", "SOFTWARE", "OFFICE",
    "SHOOT", "MARKETING", "FUEL", "MAINTENANCE", "OTHER",
  ]).optional(),
  receipt: z.string().optional(),
  expenseDate: z.string().datetime().optional(),
});
