import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(300),
  description: z.string().max(5000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  taskType: z.enum(["REGULAR", "CONTENT_REVIEW", "BUG", "FEATURE", "IMPROVEMENT"]).default("REGULAR"),
  assigneeId: z.string().uuid().optional(),
  collaborators: z.array(z.string().uuid()).optional(),
  projectId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().uuid("Invalid task ID"),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  collaborators: z.array(z.string().uuid()).optional(),
  projectId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});
