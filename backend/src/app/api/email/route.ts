import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { sendEmail, invoiceEmailHtml } from "@/lib/email";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Role helpers ────────────────────────────────────────────────────────────

const EXECUTIVE_ROLES = ["ADMIN", "CEO", "CTO", "CFO"];
const MANAGER_ROLES = ["HR", "PRODUCT_OWNER", "BRAND_PARTNER"];

function isExecutive(role: string) {
  return EXECUTIVE_ROLES.includes(role);
}

function isManager(role: string) {
  return MANAGER_ROLES.includes(role);
}

// ─── Email template builder ──────────────────────────────────────────────────

function buildEmailHtml({
  heading,
  subtitle,
  bodyContent,
  footerText,
}: {
  heading: string;
  subtitle?: string;
  bodyContent: string;
  footerText: string;
}) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; max-width:600px; margin:0 auto; padding:24px;">
      <div style="margin-bottom:24px;">
        <h1 style="color:#10b981; font-size:20px; margin:0;">${heading}</h1>
        ${subtitle ? `<p style="color:#64748b; font-size:12px; margin:4px 0 0 0;">${subtitle}</p>` : ""}
      </div>
      <div style="font-size:14px; line-height:1.6; color:#1a1a2e;">
        ${bodyContent}
      </div>
      <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:12px; color:#94a3b8;">
        ${footerText}
      </div>
    </div>
  `;
}

// ─── Email templates ─────────────────────────────────────────────────────────

interface TemplateParams {
  recipientName?: string;
  senderName: string;
  [key: string]: any;
}

function getTemplate(templateName: string, params: TemplateParams): { subject: string; html: string } | null {
  const { recipientName, senderName } = params;
  const name = recipientName || "Team Member";

  switch (templateName) {
    case "welcome":
      return {
        subject: `Welcome to KnowAI, ${name}!`,
        html: buildEmailHtml({
          heading: "KnowAI ERP",
          subtitle: "Welcome Aboard",
          bodyContent: `
            <h2 style="color:#1a1a2e; font-size:18px;">Welcome, ${name}!</h2>
            <p>We're excited to have you join the team. Here's what you need to get started:</p>
            <ul style="padding-left:20px;">
              <li>Log in to your KnowAI dashboard to set up your profile</li>
              <li>Check out the team chat to introduce yourself</li>
              <li>Review your assigned projects and tasks</li>
              <li>Set up your notification preferences</li>
            </ul>
            <p>If you have any questions, don't hesitate to reach out to HR or your manager.</p>
            ${params.loginUrl ? `<p><a href="${params.loginUrl}" style="display:inline-block; background:#10b981; color:#fff; padding:10px 24px; border-radius:6px; text-decoration:none; margin-top:12px;">Go to Dashboard</a></p>` : ""}
          `,
          footerText: `Sent by ${senderName} via KnowAI ERP`,
        }),
      };

    case "invoice":
      return {
        subject: `Invoice ${params.invoiceNumber || ""} from KnowAI`,
        html: buildEmailHtml({
          heading: "KnowAI ERP",
          subtitle: "Invoice",
          bodyContent: `
            <h2 style="color:#1a1a2e; font-size:18px;">Invoice for ${name}</h2>
            <p>Please find below the details of your invoice:</p>
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <tr style="background:#f1f5f9;">
                <td style="padding:8px 12px; font-weight:600;">Invoice #</td>
                <td style="padding:8px 12px;">${params.invoiceNumber || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; font-weight:600;">Amount</td>
                <td style="padding:8px 12px;">${params.currency || "INR"} ${params.total || 0}</td>
              </tr>
              <tr style="background:#f1f5f9;">
                <td style="padding:8px 12px; font-weight:600;">Due Date</td>
                <td style="padding:8px 12px;">${params.dueDate ? new Date(params.dueDate).toLocaleDateString() : "On receipt"}</td>
              </tr>
            </table>
            ${params.notes ? `<p style="color:#64748b; font-style:italic;">${params.notes}</p>` : ""}
          `,
          footerText: `Sent by ${senderName} via KnowAI ERP`,
        }),
      };

    case "leave_approval":
      return {
        subject: `Leave Request ${params.approved ? "Approved" : "Update"} - KnowAI`,
        html: buildEmailHtml({
          heading: "KnowAI ERP",
          subtitle: "Leave Management",
          bodyContent: `
            <h2 style="color:#1a1a2e; font-size:18px;">Leave Request ${params.approved ? "Approved" : "Rejected"}</h2>
            <p>Hi ${name},</p>
            <p>Your leave request has been <strong style="color:${params.approved ? "#10b981" : "#ef4444"};">${params.approved ? "approved" : "rejected"}</strong>.</p>
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <tr style="background:#f1f5f9;">
                <td style="padding:8px 12px; font-weight:600;">Leave Type</td>
                <td style="padding:8px 12px;">${params.leaveType || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px; font-weight:600;">From</td>
                <td style="padding:8px 12px;">${params.startDate ? new Date(params.startDate).toLocaleDateString() : "N/A"}</td>
              </tr>
              <tr style="background:#f1f5f9;">
                <td style="padding:8px 12px; font-weight:600;">To</td>
                <td style="padding:8px 12px;">${params.endDate ? new Date(params.endDate).toLocaleDateString() : "N/A"}</td>
              </tr>
            </table>
            ${params.approverNote ? `<p><strong>Note from approver:</strong> ${params.approverNote}</p>` : ""}
          `,
          footerText: `Sent by ${senderName} via KnowAI ERP`,
        }),
      };

    case "task_assigned":
      return {
        subject: `New Task Assigned: ${params.taskTitle || "Untitled"} - KnowAI`,
        html: buildEmailHtml({
          heading: "KnowAI ERP",
          subtitle: "Task Management",
          bodyContent: `
            <h2 style="color:#1a1a2e; font-size:18px;">New Task Assigned</h2>
            <p>Hi ${name},</p>
            <p>A new task has been assigned to you:</p>
            <div style="background:#f8fafc; border-left:4px solid #10b981; padding:12px 16px; margin:16px 0;">
              <p style="margin:0; font-weight:600;">${params.taskTitle || "Untitled Task"}</p>
              ${params.taskDescription ? `<p style="margin:8px 0 0; color:#64748b;">${params.taskDescription}</p>` : ""}
              ${params.dueDate ? `<p style="margin:8px 0 0; color:#ef4444; font-size:13px;">Due: ${new Date(params.dueDate).toLocaleDateString()}</p>` : ""}
              ${params.priority ? `<p style="margin:8px 0 0; font-size:13px;">Priority: <strong>${params.priority}</strong></p>` : ""}
            </div>
            <p>Log in to your dashboard to view the full details.</p>
          `,
          footerText: `Sent by ${senderName} via KnowAI ERP`,
        }),
      };

    case "payroll_processed":
      return {
        subject: `Payroll Processed for ${params.month || ""}/${params.year || ""} - KnowAI`,
        html: buildEmailHtml({
          heading: "KnowAI ERP",
          subtitle: "Payroll",
          bodyContent: `
            <h2 style="color:#1a1a2e; font-size:18px;">Payroll Processed</h2>
            <p>Hi ${name},</p>
            <p>Your salary for <strong>${params.month || ""}/${params.year || ""}</strong> has been processed.</p>
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <tr style="background:#f1f5f9;">
                <td style="padding:8px 12px; font-weight:600;">Total Pay</td>
                <td style="padding:8px 12px;">${params.currency || "INR"} ${params.totalPay || 0}</td>
              </tr>
            </table>
            <p>Log in to view your full payslip details.</p>
          `,
          footerText: `Sent by ${senderName} via KnowAI ERP`,
        }),
      };

    default:
      return null;
  }
}

// ─── GET: Email history + analytics ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // ── Email history (all roles) ──
    if (!action || action === "history") {
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));
      const typeFilter = searchParams.get("type");
      const folder = searchParams.get("folder") || "sent";

      let emailWhere: Record<string, unknown>;

      if (folder === "inbox") {
        // All users can see emails sent TO them
        emailWhere = { toEmail: { contains: user.email } };
      } else {
        // Sent folder: emails sent BY this user
        emailWhere = { fromId: user.id };
      }

      if (typeFilter) emailWhere.type = typeFilter;

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
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.sentEmail.count({ where: emailWhere }),
      ]);

      return jsonOk({
        success: true,
        data: sentEmails,
        pagination: {
          page,
          pageSize,
          total: totalEmails,
          totalPages: Math.ceil(totalEmails / pageSize),
        },
      });
    }

    // ── Dashboard analytics (ADMIN / CEO only) ──
    if (action === "analytics") {
      if (!isExecutive(user.role)) {
        return jsonError("Only executives can view email analytics", 403);
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [totalAll, totalLast30, totalLast7, byType, byStatus, topSenders] = await Promise.all([
        prisma.sentEmail.count(),
        prisma.sentEmail.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
        prisma.sentEmail.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
        prisma.sentEmail.groupBy({
          by: ["type"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        prisma.sentEmail.groupBy({
          by: ["status"],
          _count: { id: true },
        }),
        prisma.sentEmail.groupBy({
          by: ["fromId"],
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 10,
        }),
      ]);

      // Enrich top senders with user info
      const senderIds = topSenders.map((s) => s.fromId);
      const senderUsers = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      });
      const senderMap = Object.fromEntries(senderUsers.map((u) => [u.id, u]));

      const enrichedSenders = topSenders.map((s) => ({
        user: senderMap[s.fromId] || { id: s.fromId, firstName: "Unknown", lastName: "" },
        count: s._count.id,
      }));

      return jsonOk({
        success: true,
        data: {
          totalEmails: totalAll,
          last30Days: totalLast30,
          last7Days: totalLast7,
          byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
          byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
          topSenders: enrichedSenders,
        },
      });
    }

    // ── List available templates ──
    if (action === "templates") {
      const templates = [
        { id: "welcome", name: "Welcome Email", description: "Onboarding email for new team members", requiredFields: ["recipientName", "loginUrl"] },
        { id: "invoice", name: "Invoice Email", description: "Send invoice to clients", requiredFields: ["invoiceNumber", "total", "currency"] },
        { id: "leave_approval", name: "Leave Approval/Rejection", description: "Notify employee of leave decision", requiredFields: ["approved", "leaveType", "startDate", "endDate"] },
        { id: "task_assigned", name: "Task Assignment", description: "Notify team member of new task", requiredFields: ["taskTitle"] },
        { id: "payroll_processed", name: "Payroll Processed", description: "Notify employee of salary processing", requiredFields: ["month", "year", "totalPay"] },
      ];

      return jsonOk({ success: true, data: templates });
    }

    return jsonError("Invalid action", 400);
  } catch (error) {
    console.error("Email GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { action } = body;

    if (!action) return jsonError("action is required", 400);

    // ─── Send Invoice ────────────────────────────────────────────────────────
    if (action === "sendInvoice") {
      // ADMIN, CEO, CFO, or managers can send invoices
      if (!isExecutive(user.role) && !isManager(user.role)) {
        return jsonError("Only executives or managers can send invoices", 403);
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
      if (!invoice.clientEmail) return jsonError("Invoice has no client email address", 400);

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

    // ─── Send Custom Email (all roles) ───────────────────────────────────────
    if (action === "sendCustom") {
      const { to, subject, body: emailBody } = body;
      if (!to || !subject || !emailBody) {
        return jsonError("to, subject, and body are required", 400);
      }

      const html = buildEmailHtml({
        heading: "KnowAI ERP",
        bodyContent: emailBody,
        footerText: `Sent by ${user.firstName} ${user.lastName} via KnowAI ERP`,
      });

      const result = await sendEmail({ to, subject, html });

      if (!result.success) {
        return jsonError("Failed to send email: " + (result.error || "Unknown error"), 500);
      }

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

    // ─── Send Newsletter (ADMIN only) ────────────────────────────────────────
    if (action === "sendNewsletter") {
      if (!isExecutive(user.role)) {
        return jsonError("Only executives can send newsletters", 403);
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

      const html = buildEmailHtml({
        heading: "KnowAI ERP",
        subtitle: "Team Newsletter",
        bodyContent: newsletterBody,
        footerText: `Sent by ${user.firstName} ${user.lastName} (${user.role}) via KnowAI ERP`,
      });

      const result = await sendEmail({ to: emails, subject, html });

      if (!result.success) {
        return jsonError("Failed to send newsletter: " + (result.error || "Unknown error"), 500);
      }

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

    // ─── Send from template ──────────────────────────────────────────────────
    if (action === "sendTemplate") {
      const { to, templateName, templateParams } = body;
      if (!to || !templateName) {
        return jsonError("to and templateName are required", 400);
      }

      const senderName = `${user.firstName} ${user.lastName}`;
      const template = getTemplate(templateName, {
        ...templateParams,
        senderName,
      });

      if (!template) {
        return jsonError(`Unknown template: ${templateName}. Available: welcome, invoice, leave_approval, task_assigned, payroll_processed`, 400);
      }

      // Permission checks for sensitive templates
      if (templateName === "payroll_processed" && !isExecutive(user.role) && user.role !== "HR" && !["SR_ACCOUNTANT", "JR_ACCOUNTANT"].includes(user.role)) {
        return jsonError("Only HR, Accounting, or executives can send payroll emails", 403);
      }
      if (templateName === "leave_approval" && !isExecutive(user.role) && !isManager(user.role) && user.role !== "HR") {
        return jsonError("Only HR, managers, or executives can send leave approval emails", 403);
      }

      const result = await sendEmail({
        to,
        subject: template.subject,
        html: template.html,
      });

      if (!result.success) {
        return jsonError("Failed to send email: " + (result.error || "Unknown error"), 500);
      }

      await prisma.sentEmail.create({
        data: {
          fromId: user.id,
          toEmail: Array.isArray(to) ? to.join(", ") : to,
          subject: template.subject,
          body: template.html,
          status: "SENT",
          type: templateName.toUpperCase(),
        },
      });

      return jsonOk({
        success: true,
        message: `Template email (${templateName}) sent to ${Array.isArray(to) ? to.join(", ") : to}`,
        simulated: result.simulated || false,
      });
    }

    return jsonError(`Unknown action: ${action}`, 400);
  } catch (error) {
    console.error("Email API error:", error);
    return jsonError("Internal server error", 500);
  }
}
