import { NextRequest } from "next/server";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

// ---------------------------------------------------------------------------
// In-memory SOP store (MVP — resets on server restart)
// ---------------------------------------------------------------------------

interface SOPStep {
  order: number;
  title: string;
  description: string;
  assigneeRole: string;
}

interface SOP {
  id: string;
  title: string;
  description: string;
  department: string;
  steps: SOPStep[];
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const sopStore = new Map<string, SOP>();
let idCounter = 1;

function generateId(): string {
  return `sop_${Date.now()}_${idCounter++}`;
}

// Seed some example data
function seedIfEmpty() {
  if (sopStore.size > 0) return;

  const seed: Omit<SOP, "id" | "createdAt" | "updatedAt">[] = [
    {
      title: "New Employee Onboarding",
      description: "Standard process for onboarding new hires into the organization.",
      department: "HR",
      steps: [
        { order: 1, title: "Send Offer Letter", description: "Prepare and send the formal offer letter via email.", assigneeRole: "HR" },
        { order: 2, title: "Collect Documents", description: "Collect ID proof, address proof, bank details, and education certificates.", assigneeRole: "HR" },
        { order: 3, title: "Setup Workspace", description: "Create email account, Slack workspace, and assign laptop.", assigneeRole: "Tech" },
        { order: 4, title: "Orientation Session", description: "Conduct a 1-hour orientation covering company culture, policies, and tools.", assigneeRole: "HR" },
        { order: 5, title: "Assign Buddy", description: "Pair the new hire with an existing team member for the first two weeks.", assigneeRole: "PRODUCT_OWNER" },
      ],
      status: "ACTIVE",
      version: 2,
      createdBy: "system",
    },
    {
      title: "Content Publishing Workflow",
      description: "End-to-end process for publishing content across platforms.",
      department: "Content",
      steps: [
        { order: 1, title: "Draft Content", description: "Write the initial draft in Google Docs or Notion.", assigneeRole: "GUY" },
        { order: 2, title: "Internal Review", description: "Submit for peer review and incorporate feedback.", assigneeRole: "PRODUCT_OWNER" },
        { order: 3, title: "Client Approval", description: "Share with client for final approval.", assigneeRole: "PRODUCT_OWNER" },
        { order: 4, title: "Schedule & Publish", description: "Schedule the post using the platform's scheduler.", assigneeRole: "GUY" },
      ],
      status: "ACTIVE",
      version: 1,
      createdBy: "system",
    },
    {
      title: "Server Deployment Checklist",
      description: "Steps to safely deploy code to production servers.",
      department: "Tech",
      steps: [
        { order: 1, title: "Run Tests", description: "Execute full test suite and ensure all tests pass.", assigneeRole: "GUY" },
        { order: 2, title: "Code Review", description: "Get approval from at least one senior dev.", assigneeRole: "PRODUCT_OWNER" },
        { order: 3, title: "Staging Deploy", description: "Deploy to staging and verify functionality.", assigneeRole: "GUY" },
        { order: 4, title: "Production Deploy", description: "Deploy to production during low-traffic window.", assigneeRole: "PRODUCT_OWNER" },
        { order: 5, title: "Monitor", description: "Watch error rates and performance for 30 minutes post-deploy.", assigneeRole: "GUY" },
      ],
      status: "DRAFT",
      version: 1,
      createdBy: "system",
    },
  ];

  const now = new Date().toISOString();
  for (const s of seed) {
    const id = generateId();
    sopStore.set(id, { id, ...s, createdAt: now, updatedAt: now });
  }
}

// ---------------------------------------------------------------------------
// GET /api/sops?department=X&status=X
// ---------------------------------------------------------------------------
export const GET = createHandler({}, async (req: NextRequest) => {
  seedIfEmpty();

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const status = searchParams.get("status");

  let sops = Array.from(sopStore.values());

  if (department && department !== "All") {
    sops = sops.filter((s) => s.department === department);
  }
  if (status && status !== "All") {
    sops = sops.filter((s) => s.status === status);
  }

  sops.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return jsonOk({ success: true, data: sops });
});

// ---------------------------------------------------------------------------
// POST /api/sops — create SOP (ADMIN, PROJECT_MANAGER, HR only)
// ---------------------------------------------------------------------------
export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  if (!["ADMIN", "PRODUCT_OWNER", "HR"].includes(user.role)) {
    return jsonError("Only Admin, PM, or HR can create SOPs", 403);
  }

  seedIfEmpty();

  const body = await req.json();
  const { title, description, department, steps, status } = body;

  if (!title || !department) {
    return jsonError("Title and department are required", 400);
  }

  const id = generateId();
  const now = new Date().toISOString();

  const sop: SOP = {
    id,
    title,
    description: description || "",
    department,
    steps: (steps || []).map((s: SOPStep, i: number) => ({
      order: s.order ?? i + 1,
      title: s.title || "",
      description: s.description || "",
      assigneeRole: s.assigneeRole || "",
    })),
    status: status === "ACTIVE" ? "ACTIVE" : "DRAFT",
    version: 1,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  };

  sopStore.set(id, sop);

  return jsonOk({ success: true, data: sop }, 201);
});

// ---------------------------------------------------------------------------
// PATCH /api/sops — update SOP
// ---------------------------------------------------------------------------
export const PATCH = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  if (!["ADMIN", "PRODUCT_OWNER", "HR"].includes(user.role)) {
    return jsonError("Only Admin, PM, or HR can update SOPs", 403);
  }

  seedIfEmpty();

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return jsonError("SOP id is required", 400);

  const sop = sopStore.get(id);
  if (!sop) return jsonError("SOP not found", 404);

  const previousStatus = sop.status;

  if (updates.title !== undefined) sop.title = updates.title;
  if (updates.description !== undefined) sop.description = updates.description;
  if (updates.department !== undefined) sop.department = updates.department;
  if (updates.steps !== undefined) {
    sop.steps = updates.steps.map((s: SOPStep, i: number) => ({
      order: s.order ?? i + 1,
      title: s.title || "",
      description: s.description || "",
      assigneeRole: s.assigneeRole || "",
    }));
  }
  if (updates.status !== undefined) sop.status = updates.status;

  // Bump version when publishing (transitioning to ACTIVE or re-publishing while already ACTIVE)
  if (updates.status === "ACTIVE" && (previousStatus === "DRAFT" || previousStatus === "ACTIVE")) {
    sop.version += 1;
  }

  sop.updatedAt = new Date().toISOString();
  sopStore.set(id, sop);

  return jsonOk({ success: true, data: sop });
});

// ---------------------------------------------------------------------------
// DELETE /api/sops?id=X — delete SOP (ADMIN only)
// ---------------------------------------------------------------------------
export const DELETE = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  if (user.role !== "ADMIN") {
    return jsonError("Only Admin can delete SOPs", 403);
  }

  seedIfEmpty();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return jsonError("SOP id is required", 400);

  const existed = sopStore.delete(id);
  if (!existed) return jsonError("SOP not found", 404);

  return jsonOk({ success: true, message: "SOP deleted" });
});
