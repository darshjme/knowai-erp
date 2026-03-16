import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { sendEmail, invoiceEmailHtml } from "@/lib/email";

// ─── GET: SMTP status + sent email history + unpaid invoices ──────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));
    const typeFilter = searchParams.get("type"); // CUSTOM, INVOICE, NEWSLETTER, NOTIFICATION
    const folder = searchParams.get("folder"); // inbox, sent (default)

    // SMTP config status (never expose password)
    const smtpConfig = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      fromEmail: process.env.SMTP_USER || "",
      configured: !!process.env.SMTP_USER && !!process.env.SMTP_PASS,
    };

    // Build query based on folder
    let emailWhere: Record<string, unknown>;

    if (folder === "inbox") {
      // Inbox: emails where the current user's email appears in toEmail
      emailWhere = {
        toEmail: { contains: user.email },
      };
    } else {
      // Sent (default): emails sent by this user
      emailWhere = { fromId: user.id };
    }

    if (typeFilter) {
      emailWhere.type = typeFilter;
    }

    const [sentEmails, totalEmails] = await Promise.all([
      prisma.sentEmail.findMany({
        where: emailWhere,
        select: {
          id: true,
          fromId: true,
          toEmail: true,
          subject: true,
          body: true,
          status: true,
          type: true,
          relatedId: true,
          createdAt: true,
          from: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.sentEmail.count({ where: emailWhere }),
    ]);

    // Unpaid invoices for quick-send (DRAFT or SENT status)
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["DRAFT", "SENT", "OVERDUE"] },
        clientEmail: { not: null },
      },
      select: {
        id: true,
        invoiceNumber: true,
        clientName: true,
        clientEmail: true,
        total: true,
        currency: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return jsonOk({
      smtpConfig,
      sentEmails,
      pagination: {
        page,
        pageSize,
        total: totalEmails,
        totalPages: Math.ceil(totalEmails / pageSize),
      },
      unpaidInvoices,
      userRole: user.role,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
    });
  } catch (error) {
    console.error("Email dashboard GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── POST: Proxy to email actions ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { action } = body;

    if (!action) return jsonError("action is required", 400);

    // ── Send Invoice ──────────────────────────────────────────────────────────
    if (action === "sendInvoice") {
      if (user.role !== "ADMIN" && user.role !== "PROJECT_MANAGER") {
        return jsonError("Only Admin or Project Manager can send invoices", 403);
      }

      const { invoiceId } = body;
      if (!invoiceId) return jsonError("invoiceId is required", 400);

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      });

      if (!invoice) return jsonError("Invoice not found", 404);
      if (!invoice.clientEmail) return jsonError("Invoice has no client email", 400);

      const html = invoiceEmailHtml({
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientAddress: invoice.clientAddress,
        items: invoice.items,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        discount: invoice.discount,
        total: invoice.total,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
        createdAt: invoice.createdAt,
      });

      const result = await sendEmail({
        to: invoice.clientEmail,
        subject: `Invoice ${invoice.invoiceNumber} from KnowAI`,
        html,
      });

      if (!result.success) {
        return jsonError("Failed to send email: " + (result.error || "Unknown error"), 500);
      }

      // Log sent email
      await prisma.sentEmail.create({
        data: {
          fromId: user.id,
          toEmail: invoice.clientEmail,
          subject: `Invoice ${invoice.invoiceNumber} from KnowAI`,
          body: html,
          status: "SENT",
          type: "INVOICE",
          relatedId: invoiceId,
        },
      });

      if (invoice.status === "DRAFT") {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: "SENT" },
        });
      }

      return jsonOk({
        success: true,
        message: `Invoice sent to ${invoice.clientEmail}`,
        simulated: result.simulated || false,
      });
    }

    // ── Send Custom Email ─────────────────────────────────────────────────────
    if (action === "sendCustom") {
      const { to, subject, body: emailBody } = body;
      if (!to || !subject || !emailBody) {
        return jsonError("to, subject, and body are required", 400);
      }

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
          <div style="margin-bottom:24px;">
            <h1 style="color:#10b981; font-size:20px; margin:0;">KnowAI CRM</h1>
          </div>
          <div style="font-size:14px; line-height:1.6; color:#1a1a2e;">
            ${emailBody}
          </div>
          <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8;">
            Sent by ${user.firstName} ${user.lastName} via KnowAI CRM
          </div>
        </div>
      `;

      const result = await sendEmail({ to, subject, html });

      if (!result.success) {
        return jsonError("Failed to send email: " + (result.error || "Unknown error"), 500);
      }

      // Log sent email
      await prisma.sentEmail.create({
        data: {
          fromId: user.id,
          toEmail: Array.isArray(to) ? to.join(", ") : to,
          subject,
          body: html,
          status: "SENT",
          type: "CUSTOM",
        },
      });

      return jsonOk({
        success: true,
        message: `Email sent to ${Array.isArray(to) ? to.join(", ") : to}`,
        simulated: result.simulated || false,
      });
    }

    // ── Send Newsletter ───────────────────────────────────────────────────────
    if (action === "sendNewsletter") {
      if (user.role !== "ADMIN") {
        return jsonError("Only Admin can send newsletters", 403);
      }

      const { subject, body: newsletterBody } = body;
      if (!subject || !newsletterBody) {
        return jsonError("subject and body are required", 400);
      }

      const teamMembers = await prisma.user.findMany({
        select: { email: true, firstName: true },
      });

      if (teamMembers.length === 0) {
        return jsonError("No active team members found", 400);
      }

      const emails = teamMembers.map((m) => m.email).filter(Boolean);

      const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
          <div style="margin-bottom:24px;">
            <h1 style="color:#10b981; font-size:20px; margin:0;">KnowAI CRM</h1>
            <p style="color:#64748b; font-size:12px; margin:4px 0 0 0;">Team Newsletter</p>
          </div>
          <div style="font-size:14px; line-height:1.6; color:#1a1a2e;">
            ${newsletterBody}
          </div>
          <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8;">
            Sent by ${user.firstName} ${user.lastName} (Admin) via KnowAI CRM
          </div>
        </div>
      `;

      const result = await sendEmail({ to: emails, subject, html });

      if (!result.success) {
        return jsonError("Failed to send newsletter: " + (result.error || "Unknown error"), 500);
      }

      // Log sent email
      await prisma.sentEmail.create({
        data: {
          fromId: user.id,
          toEmail: emails.join(", "),
          subject,
          body: html,
          status: "SENT",
          type: "NEWSLETTER",
        },
      });

      return jsonOk({
        success: true,
        message: `Newsletter sent to ${emails.length} team member(s)`,
        simulated: result.simulated || false,
      });
    }

    return jsonError(`Unknown action: ${action}`, 400);
  } catch (error) {
    console.error("Email dashboard POST error:", error);
    return jsonError("Internal server error", 500);
  }
}
