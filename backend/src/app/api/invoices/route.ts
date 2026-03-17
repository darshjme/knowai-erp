import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// Roles with full access (view + create + update + delete)
const INVOICES_FULL_ACCESS_ROLES = ["CTO", "CEO", "CFO", "ADMIN", "SR_ACCOUNTANT", "JR_ACCOUNTANT", "BRAND_FACE"];
const INVOICES_VIEW_ROLES = [...INVOICES_FULL_ACCESS_ROLES, "PRODUCT_OWNER"];

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!INVOICES_VIEW_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have access to invoices", 403);
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const clientId = searchParams.get("clientId");

    const where: Record<string, unknown> = {
      // Workspace isolation: only show invoices created by users in the same workspace
      createdBy: { workspaceId: user.workspaceId },
    };

    if (clientId) where.clientId = clientId;

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: "insensitive" } },
        { invoiceNumber: { contains: search, mode: "insensitive" } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return jsonOk({ success: true, data: invoices, total: invoices.length });
  } catch (error) {
    console.error("Invoices GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!INVOICES_FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have permission to create invoices", 403);
    }

    const body = await req.json();
    const {
      clientName,
      clientEmail,
      clientPhone,
      clientAddress,
      items,
      subtotal,
      tax,
      discount,
      total,
      dueDate,
      notes,
      projectId,
      status,
      currency,
    } = body;

    if (!clientName || !items || total === undefined) {
      return jsonError("clientName, items, and total are required", 400);
    }

    if (typeof total !== "number" || isNaN(total)) {
      return jsonError("total must be a valid number", 400);
    }
    if (subtotal !== undefined && (typeof subtotal !== "number" || isNaN(subtotal))) {
      return jsonError("subtotal must be a valid number", 400);
    }
    if (tax !== undefined && (typeof tax !== "number" || isNaN(tax))) {
      return jsonError("tax must be a valid number", 400);
    }
    if (discount !== undefined && (typeof discount !== "number" || isNaN(discount))) {
      return jsonError("discount must be a valid number", 400);
    }

    // Auto-generate invoice number: INV-YYYY-NNNN
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: "desc" },
    });

    let seq = 1;
    if (lastInvoice) {
      const lastSeq = parseInt(lastInvoice.invoiceNumber.replace(prefix, ""), 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    const invoiceNumber = `${prefix}${String(seq).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientName,
        clientEmail: clientEmail || null,
        clientPhone: clientPhone || null,
        clientAddress: clientAddress || null,
        items: typeof items === "string" ? items : JSON.stringify(items),
        subtotal: subtotal || 0,
        tax: tax || 0,
        discount: discount || 0,
        total,
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        projectId: projectId || null,
        currency: currency || "INR",
        status: status || "DRAFT",
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return jsonOk({ success: true, data: invoice }, 201);
  } catch (error) {
    console.error("Invoices POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!INVOICES_FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have permission to update invoices", 403);
    }

    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) return jsonError("Invoice id is required", 400);

    const invoice = await prisma.invoice.findFirst({
      where: { id, createdBy: { workspaceId: user.workspaceId } },
    });
    if (!invoice) return jsonError("Invoice not found", 404);

    const data: Record<string, unknown> = {};

    if (fields.clientName !== undefined) data.clientName = fields.clientName;
    if (fields.clientEmail !== undefined) data.clientEmail = fields.clientEmail;
    if (fields.clientPhone !== undefined) data.clientPhone = fields.clientPhone;
    if (fields.clientAddress !== undefined) data.clientAddress = fields.clientAddress;
    if (fields.items !== undefined) {
      data.items = typeof fields.items === "string" ? fields.items : JSON.stringify(fields.items);
    }
    if (fields.subtotal !== undefined) data.subtotal = fields.subtotal;
    if (fields.tax !== undefined) data.tax = fields.tax;
    if (fields.discount !== undefined) data.discount = fields.discount;
    if (fields.total !== undefined) data.total = fields.total;
    if (fields.dueDate !== undefined) data.dueDate = fields.dueDate ? new Date(fields.dueDate) : null;
    if (fields.notes !== undefined) data.notes = fields.notes;
    if (fields.projectId !== undefined) data.projectId = fields.projectId;
    if (fields.currency !== undefined) data.currency = fields.currency;

    if (fields.status !== undefined) {
      data.status = fields.status;
      // Auto-set paidOn when marking as PAID
      if (fields.status === "PAID" && invoice.status !== "PAID") {
        data.paidOn = new Date();
      }
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return jsonOk({ success: true, data: updated });
  } catch (error) {
    console.error("Invoices PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!INVOICES_FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Forbidden: you do not have permission to delete invoices", 403);
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return jsonError("Invoice id is required", 400);

    const invoice = await prisma.invoice.findFirst({
      where: { id, createdBy: { workspaceId: user.workspaceId } },
    });
    if (!invoice) return jsonError("Invoice not found", 404);

    if (invoice.status !== "DRAFT" && invoice.status !== "CANCELLED") {
      return jsonError("Only DRAFT or CANCELLED invoices can be deleted", 403);
    }

    await prisma.invoice.delete({ where: { id } });

    return jsonOk({ success: true, message: "Invoice deleted successfully" });
  } catch (error) {
    console.error("Invoices DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
