import { z } from "zod";

export const createInvoiceSchema = z.object({
  clientName: z.string().min(1, "Client name is required").max(200),
  clientEmail: z.string().email().optional().nullable(),
  clientPhone: z.string().max(30).optional().nullable(),
  clientAddress: z.string().max(500).optional().nullable(),
  items: z.union([z.string(), z.array(z.unknown())]),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  total: z.number({ error: "Total is required" }),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  currency: z.string().default("INR"),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).default("DRAFT"),
});

export const updateInvoiceSchema = z.object({
  id: z.string().uuid("Invalid invoice ID"),
  clientName: z.string().min(1).max(200).optional(),
  clientEmail: z.string().email().optional().nullable(),
  clientPhone: z.string().max(30).optional().nullable(),
  clientAddress: z.string().max(500).optional().nullable(),
  items: z.union([z.string(), z.array(z.unknown())]).optional(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  total: z.number().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  currency: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
});
