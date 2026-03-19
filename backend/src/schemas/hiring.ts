import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().min(1, "Job title is required").max(200),
  department: z.string().min(1, "Department is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  requirements: z.array(z.string()).optional(),
  salaryMin: z.number().int().min(0).optional(),
  salaryMax: z.number().int().min(0).optional(),
  currency: z.string().default("INR"),
  location: z.string().optional(),
  type: z.enum(["Full-time", "Part-time", "Contract", "Intern"]).default("Full-time"),
  status: z.enum(["DRAFT", "OPEN", "ON_HOLD", "CLOSED"]).default("OPEN"),
});

export const createCandidateSchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().min(1, "Candidate name is required").max(100),
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  resumeUrl: z.string().url().optional(),
  linkedinUrl: z.string().url().optional(),
  coverLetter: z.string().max(5000).optional(),
  location: z.string().optional(),
  experience: z.string().optional(),
  education: z.string().optional(),
  skills: z.array(z.string()).optional(),
  source: z.enum(["MANUAL", "CSV", "EXCEL", "URL", "RESUME", "REFERRAL"]).default("MANUAL"),
});

export const rateCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
});

export const addCandidateCommentSchema = z.object({
  candidateId: z.string().uuid(),
  body: z.string().min(1, "Comment body is required").max(5000),
  mentions: z.any().optional(),
});
