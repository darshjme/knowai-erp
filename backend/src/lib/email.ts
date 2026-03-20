import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || "KnowAI ERP <noreply@knowai.biz>";

/**
 * Send an email via Resend.
 * Falls back to console mock if RESEND_API_KEY is not set.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL MOCK] To: ${to}, Subject: ${subject}`);
    return { messageId: "mock-" + Date.now() };
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[EMAIL ERROR]", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return { messageId: data?.id || "unknown" };
}

// ─── Email Templates ────────────────────────────────────────────────

export function invoiceEmailHtml(data: { clientName: string; invoiceNumber: string; amount: string; dueDate: string }) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;max-width:600px;margin:0 auto;padding:32px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:#007AFF;color:#fff;font-weight:700;font-size:16px;width:40px;height:40px;line-height:40px;border-radius:12px">K</div>
      <h2 style="color:#1D1D1F;margin:16px 0 0;font-size:20px">Invoice from KnowAI</h2>
    </div>
    <p style="color:#1D1D1F">Dear ${data.clientName},</p>
    <p style="color:#1D1D1F">Please find your invoice <strong>${data.invoiceNumber}</strong> for <strong>${data.amount}</strong>.</p>
    <p style="color:#1D1D1F">Due date: <strong>${data.dueDate}</strong></p>
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0"/>
    <p style="color:#86868B;font-size:13px">KnowAI Team &middot; crm.knowai.club</p>
  </div>`;
}

export function welcomeEmailHtml(name: string, email: string, tempPassword?: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;max-width:600px;margin:0 auto;padding:32px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:#007AFF;color:#fff;font-weight:700;font-size:16px;width:40px;height:40px;line-height:40px;border-radius:12px">K</div>
      <h2 style="color:#1D1D1F;margin:16px 0 0;font-size:20px">Welcome to KnowAI!</h2>
    </div>
    <p style="color:#1D1D1F">Hi ${name},</p>
    <p style="color:#1D1D1F">Your KnowAI ERP account has been created. Here are your login details:</p>
    <div style="background:#F5F5F7;border-radius:12px;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px;color:#86868B;font-size:13px">Login URL</p>
      <p style="margin:0 0 16px;color:#007AFF;font-weight:600">https://crm.knowai.club</p>
      <p style="margin:0 0 8px;color:#86868B;font-size:13px">Email</p>
      <p style="margin:0 0 16px;color:#1D1D1F;font-weight:500">${email}</p>
      ${tempPassword ? `<p style="margin:0 0 8px;color:#86868B;font-size:13px">Temporary Password</p>
      <p style="margin:0;color:#1D1D1F;font-weight:500;font-family:monospace">${tempPassword}</p>` : ""}
    </div>
    <p style="color:#1D1D1F">Please log in and complete your profile within 14 days.</p>
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0"/>
    <p style="color:#86868B;font-size:13px">KnowAI Team &middot; crm.knowai.club</p>
  </div>`;
}

export function passwordResetEmailHtml(name: string, resetUrl: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;max-width:600px;margin:0 auto;padding:32px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:#007AFF;color:#fff;font-weight:700;font-size:16px;width:40px;height:40px;line-height:40px;border-radius:12px">K</div>
      <h2 style="color:#1D1D1F;margin:16px 0 0;font-size:20px">Reset Your Password</h2>
    </div>
    <p style="color:#1D1D1F">Hi ${name},</p>
    <p style="color:#1D1D1F">Click the button below to reset your password. This link expires in 1 hour.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="${resetUrl}" style="display:inline-block;background:#007AFF;color:#fff;font-weight:600;padding:12px 32px;border-radius:12px;text-decoration:none;font-size:15px">Reset Password</a>
    </div>
    <p style="color:#86868B;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0"/>
    <p style="color:#86868B;font-size:13px">KnowAI Team &middot; crm.knowai.club</p>
  </div>`;
}

export function notificationEmailHtml(name: string, title: string, message: string, linkUrl?: string) {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;max-width:600px;margin:0 auto;padding:32px">
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:#007AFF;color:#fff;font-weight:700;font-size:16px;width:40px;height:40px;line-height:40px;border-radius:12px">K</div>
    </div>
    <p style="color:#1D1D1F">Hi ${name},</p>
    <h3 style="color:#1D1D1F;margin:16px 0 8px">${title}</h3>
    <p style="color:#1D1D1F">${message}</p>
    ${linkUrl ? `<div style="text-align:center;margin:24px 0">
      <a href="https://crm.knowai.club${linkUrl}" style="display:inline-block;background:#007AFF;color:#fff;font-weight:600;padding:10px 24px;border-radius:12px;text-decoration:none;font-size:14px">View in KnowAI</a>
    </div>` : ""}
    <hr style="border:none;border-top:1px solid rgba(0,0,0,0.06);margin:24px 0"/>
    <p style="color:#86868B;font-size:13px">KnowAI Team &middot; crm.knowai.club</p>
  </div>`;
}

export default { sendEmail, invoiceEmailHtml, welcomeEmailHtml, passwordResetEmailHtml, notificationEmailHtml };
