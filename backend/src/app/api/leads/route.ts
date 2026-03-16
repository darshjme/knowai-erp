import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";

// ─── CSV parser (no external library) ────────────────────────────────────────
function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ""; });
    return row;
  });
}

// Roles that can see all leads
const LEADS_FULL_ACCESS_ROLES = ["CEO", "CTO", "ADMIN", "PRODUCT_OWNER", "BRAND_FACE"];
// BRAND_PARTNER sees only assigned leads
const LEADS_ALL_ALLOWED_ROLES = [...LEADS_FULL_ACCESS_ROLES, "BRAND_PARTNER"];

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!LEADS_ALL_ALLOWED_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have access to leads", 403);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const clientId = searchParams.get("clientId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "100", 10);

    const where: Record<string, unknown> = { workspaceId: user.workspaceId };

    // BRAND_PARTNER can only see leads assigned to them
    if (user.role === "BRAND_PARTNER") {
      where.assigneeId = user.id;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { source: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    if (clientId) where.clientId = clientId;
    if (dateFrom || dateTo) {
      const createdAt: Record<string, unknown> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) createdAt.lte = new Date(dateTo + "T23:59:59.999Z");
      where.createdAt = createdAt;
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, company: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          tasks: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return jsonOk({ success: true, data: leads, total, page, pageSize });
  } catch (error) {
    console.error("Leads GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!LEADS_FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have permission to create leads", 403);
    }

    const body = await req.json();

    // CSV Import
    if (body.action === "import" && body.csv) {
      const rows = parseCSV(body.csv);
      if (!rows.length) return jsonError("No valid rows found in CSV", 400);

      const created = await prisma.lead.createMany({
        data: rows.map((r) => ({
          title: r.title || r.Title || "Untitled Lead",
          value: r.value || r.Value ? parseFloat(r.value || r.Value) : null,
          status: "NEW" as const,
          source: r.source || r.Source || null,
          notes: r.notes || r.Notes || null,
          workspaceId: user.workspaceId,
          createdById: user.id,
        })),
        skipDuplicates: true,
      });

      return jsonOk({ success: true, imported: created.count }, 201);
    }

    // Single create
    const { title, value, status, source, clientId, assigneeId, notes, nextFollowUp, taskIds } = body;
    if (!title) return jsonError("Lead title is required", 400);

    const lead = await prisma.lead.create({
      data: {
        title,
        value: value ? parseFloat(value) : null,
        status: status || "NEW",
        source: source || null,
        clientId: clientId || null,
        assigneeId: assigneeId || null,
        notes: notes || null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
        workspaceId: user.workspaceId,
        createdById: user.id,
        ...(taskIds && taskIds.length > 0
          ? {
              tasks: {
                create: taskIds.map((taskId: string) => ({ taskId })),
              },
            }
          : {}),
      },
      include: {
        client: { select: { id: true, name: true, company: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        tasks: true,
      },
    });

    // Notify assignee when a lead is assigned to them
    if (lead.assigneeId && lead.assigneeId !== user.id) {
      const assignerName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
      createNotification(
        lead.assigneeId,
        "LEAD_ASSIGNED",
        "New lead assigned to you",
        `${assignerName} assigned you the lead "${lead.title}"`,
        `/leads?highlight=${lead.id}`,
        { leadId: lead.id, assignerName }
      ).catch(console.error);
    }

    return jsonOk({ success: true, data: lead }, 201);
  } catch (error) {
    console.error("Leads POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!LEADS_FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have permission to update leads", 403);
    }

    const body = await req.json();
    const { id, taskIds, ...fields } = body;
    if (!id) return jsonError("Lead id is required", 400);

    const existing = await prisma.lead.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!existing) return jsonError("Lead not found", 404);

    const allowed = ["title", "value", "status", "source", "clientId", "assigneeId", "notes", "nextFollowUp"];
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === "value") {
          updateData[key] = fields[key] ? parseFloat(fields[key]) : null;
        } else if (key === "nextFollowUp") {
          updateData[key] = fields[key] ? new Date(fields[key]) : null;
        } else {
          updateData[key] = fields[key] || null;
        }
      }
    }

    // Handle task links
    if (taskIds !== undefined) {
      await prisma.leadTask.deleteMany({ where: { leadId: id } });
      if (taskIds.length > 0) {
        await prisma.leadTask.createMany({
          data: taskIds.map((taskId: string) => ({ leadId: id, taskId })),
          skipDuplicates: true,
        });
      }
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, company: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        tasks: true,
      },
    });

    // Notify new assignee on lead reassignment
    if (fields.assigneeId && fields.assigneeId !== existing.assigneeId && fields.assigneeId !== user.id) {
      const assignerName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
      createNotification(
        fields.assigneeId,
        "LEAD_ASSIGNED",
        "Lead assigned to you",
        `${assignerName} assigned you the lead "${lead.title}"`,
        `/leads?highlight=${lead.id}`,
        { leadId: lead.id, assignerName }
      ).catch(console.error);
    }

    return jsonOk({ success: true, data: lead });
  } catch (error) {
    console.error("Leads PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!LEADS_FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have permission to delete leads", 403);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("Lead id is required", 400);

    const existing = await prisma.lead.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!existing) return jsonError("Lead not found", 404);

    await prisma.lead.delete({ where: { id } });
    return jsonOk({ success: true, message: "Lead deleted" });
  } catch (error) {
    console.error("Leads DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
