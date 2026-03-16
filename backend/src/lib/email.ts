import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASSWORD || "",
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL MOCK] To: ${to}, Subject: ${subject}`);
    return { messageId: "mock-" + Date.now() };
  }
  return transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html,
  });
}

export function invoiceEmailHtml(data: { clientName: string; invoiceNumber: string; amount: string; dueDate: string }) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#146DF7">Know AI - Invoice</h2>
    <p>Dear ${data.clientName},</p>
    <p>Please find your invoice <strong>${data.invoiceNumber}</strong> for <strong>${data.amount}</strong>.</p>
    <p>Due date: ${data.dueDate}</p>
    <p>Thank you for your business.</p>
    <p style="color:#5B6B76">Know AI Team</p>
  </div>`;
}

export function welcomeEmailHtml(name: string) {
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:#146DF7">Welcome to Know AI!</h2>
    <p>Hi ${name},</p>
    <p>Your account has been created. You can now log in to the Know AI platform.</p>
    <p style="color:#5B6B76">Know AI Team</p>
  </div>`;
}

export default { sendEmail, invoiceEmailHtml, welcomeEmailHtml };
