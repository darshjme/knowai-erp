import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

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

// Roles that can see all client data
const CLIENTS_FULL_ACCESS_ROLES = ["CEO", "CTO", "ADMIN", "PRODUCT_OWNER", "BRAND_FACE", "BRAND_PARTNER"];
// Roles that can see client financial data only
const CLIENTS_FINANCIAL_ROLES = ["CFO", "SR_ACCOUNTANT", "JR_ACCOUNTANT"];
const CLIENTS_ALL_ALLOWED_ROLES = [...CLIENTS_FULL_ACCESS_ROLES, ...CLIENTS_FINANCIAL_ROLES];

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!CLIENTS_ALL_ALLOWED_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have access to clients", 403);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const industry = searchParams.get("industry");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: Record<string, unknown> = { workspaceId: user.workspaceId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
    if (industry) {
      where.industry = industry;
    }

    // CFO/ACCOUNTING only see financial-related fields
    const isFinancialOnly = CLIENTS_FINANCIAL_ROLES.includes(user.role);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryBase: any = {
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    };

    if (isFinancialOnly) {
      queryBase.select = {
        id: true,
        name: true,
        company: true,
        email: true,
        workspaceId: true,
        createdAt: true,
        _count: { select: { invoices: true } },
      };
    } else {
      queryBase.include = {
        _count: { select: { leads: true, invoices: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      };
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany(queryBase),
      prisma.client.count({ where }),
    ]);

    return jsonOk({ success: true, data: clients, total, page, pageSize });
  } catch (error) {
    console.error("Clients GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!CLIENTS_FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have permission to create clients", 403);
    }

    const body = await req.json();

    // CSV Import
    if (body.action === "import" && body.csv) {
      const rows = parseCSV(body.csv);
      if (!rows.length) return jsonError("No valid rows found in CSV", 400);

      const created = await prisma.client.createMany({
        data: rows.map((r) => ({
          name: r.name || r.Name || "Unnamed",
          email: r.email || r.Email || null,
          phone: r.phone || r.Phone || null,
          company: r.company || r.Company || null,
          address: r.address || r.Address || null,
          website: r.website || r.Website || null,
          industry: r.industry || r.Industry || null,
          notes: r.notes || r.Notes || null,
          workspaceId: user.workspaceId,
          createdById: user.id,
        })),
        skipDuplicates: true,
      });

      return jsonOk({ success: true, imported: created.count }, 201);
    }

    // Single create
    const { name, email, phone, company, address, website, industry, notes } = body;
    if (!name) return jsonError("Client name is required", 400);

    const client = await prisma.client.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
        website: website || null,
        industry: industry || null,
        notes: notes || null,
        workspaceId: user.workspaceId,
        createdById: user.id,
      },
      include: {
        _count: { select: { leads: true, invoices: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return jsonOk({ success: true, data: client }, 201);
  } catch (error) {
    console.error("Clients POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!CLIENTS_FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have permission to update clients", 403);
    }

    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return jsonError("Client id is required", 400);

    const existing = await prisma.client.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!existing) return jsonError("Client not found", 404);

    const allowed = ["name", "email", "phone", "company", "address", "website", "industry", "notes"];
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) updateData[key] = fields[key] || null;
    }

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { leads: true, invoices: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return jsonOk({ success: true, data: client });
  } catch (error) {
    console.error("Clients PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!CLIENTS_FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have permission to delete clients", 403);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("Client id is required", 400);

    const existing = await prisma.client.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });
    if (!existing) return jsonError("Client not found", 404);

    await prisma.client.delete({ where: { id } });
    return jsonOk({ success: true, message: "Client deleted" });
  } catch (error) {
    console.error("Clients DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
