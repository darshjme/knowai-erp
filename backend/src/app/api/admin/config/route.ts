import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// ─── Admin role check ────────────────────────────────────────────────────────
const ADMIN_ROLES = ["CTO", "CEO", "ADMIN"];

function isAdmin(role: string) {
  return ADMIN_ROLES.includes(role);
}

// ─── Sensitive keys (masked in GET) ──────────────────────────────────────────
const SENSITIVE_KEYS = [
  "email.smtp_password",
  "storage.aws_secret_key",
  "storage.gcp_credentials",
  "storage.gdrive_credentials",
  "integrations.google_client_secret",
  "integrations.stripe_key",
  "integrations.razorpay_key",
];

// ─── All known config keys with defaults ─────────────────────────────────────
const CONFIG_DEFAULTS: Record<string, string> = {
  // Branding
  "app.name": "Know AI",
  "app.logo_url": "/logo.png",
  "app.favicon_url": "/favicon.ico",
  "app.primary_color": "#146DF7",
  "app.tagline": "Empowering people to work with AI",

  // Email Server (SMTP)
  "email.smtp_host": "smtp.gmail.com",
  "email.smtp_port": "587",
  "email.smtp_user": "",
  "email.smtp_password": "",
  "email.smtp_secure": "false",
  "email.from_name": "Know AI",
  "email.from_address": "noreply@knowai.com",

  // File Storage
  "storage.provider": "local",
  "storage.local_path": "uploads/",
  "storage.aws_bucket": "",
  "storage.aws_region": "ap-south-1",
  "storage.aws_access_key": "",
  "storage.aws_secret_key": "",
  "storage.gcp_bucket": "",
  "storage.gcp_credentials": "",
  "storage.gdrive_folder_id": "",
  "storage.gdrive_credentials": "",
  "storage.max_file_size_mb": "50",

  // Company Info
  "company.name": "Know AI",
  "company.address": "",
  "company.phone": "",
  "company.website": "https://knowai.com",
  "company.gst_number": "",
  "company.pan_number": "",
  "company.registration_number": "",

  // Security
  "security.session_timeout_hours": "168",
  "security.max_login_attempts": "5",
  "security.lockout_duration_minutes": "15",
  "security.password_min_length": "8",
  "security.require_2fa": "false",
  "security.allowed_ips": "",

  // Notifications
  "notifications.slack_webhook": "",
  "notifications.discord_webhook": "",
  "notifications.teams_webhook": "",

  // Integrations
  "integrations.google_client_id": "",
  "integrations.google_client_secret": "",
  "integrations.stripe_key": "",
  "integrations.razorpay_key": "",
};

const KNOWN_KEYS = new Set(Object.keys(CONFIG_DEFAULTS));

// ─── Mask sensitive values ───────────────────────────────────────────────────
function maskValue(key: string, value: string): string {
  if (!SENSITIVE_KEYS.includes(key)) return value;
  if (!value || value.length === 0) return "";
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

// ─── Group configs by section ────────────────────────────────────────────────
function groupBySection(configs: Record<string, string>): Record<string, Record<string, string>> {
  const grouped: Record<string, Record<string, string>> = {};
  for (const [key, value] of Object.entries(configs)) {
    const dotIndex = key.indexOf(".");
    if (dotIndex === -1) continue;
    const section = key.substring(0, dotIndex);
    const field = key.substring(dotIndex + 1);
    if (!grouped[section]) grouped[section] = {};
    grouped[section][field] = value;
  }
  return grouped;
}

// ─── GET: Return all system configs grouped by section ───────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);
    if (!isAdmin(user.role)) return jsonError("Admin access required", 403);

    // Fetch all system configs
    const rows = await prisma.systemConfig.findMany();
    const configMap: Record<string, string> = { ...CONFIG_DEFAULTS };

    for (const row of rows) {
      if (KNOWN_KEYS.has(row.key)) {
        try {
          configMap[row.key] = JSON.parse(row.value);
        } catch {
          configMap[row.key] = row.value;
        }
      }
    }

    // Mask sensitive values
    const maskedMap: Record<string, string> = {};
    for (const [key, value] of Object.entries(configMap)) {
      maskedMap[key] = maskValue(key, value);
    }

    const grouped = groupBySection(maskedMap);

    return jsonOk({ success: true, data: grouped });
  } catch (error) {
    console.error("Admin config GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── POST: Upsert config key-value or handle actions ─────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);
    if (!isAdmin(user.role)) return jsonError("Admin access required", 403);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const { action } = body;

    // ── Test Email Action ──────────────────────────────────
    if (action === "test_email") {
      const host = await getConfigValue("email.smtp_host");
      const port = await getConfigValue("email.smtp_port");
      const smtpUser = await getConfigValue("email.smtp_user");
      const smtpPass = await getConfigValue("email.smtp_password");
      const secure = await getConfigValue("email.smtp_secure");

      if (!host || !smtpUser || !smtpPass) {
        return jsonError("SMTP not configured. Save SMTP settings first.");
      }

      try {
        const nodemailer = await import("nodemailer");
        const testTransport = nodemailer.default.createTransport({
          host,
          port: parseInt(port || "587", 10),
          secure: secure === "true",
          auth: { user: smtpUser, pass: smtpPass },
        });
        await testTransport.verify();
        return jsonOk({ success: true, message: "SMTP connection successful! Mail server is reachable." });
      } catch (error) {
        console.error("SMTP test failed:", error);
        return jsonOk({ success: false, message: "SMTP test failed: connection could not be established." });
      }
    }

    // ── Test Storage Action ────────────────────────────────
    if (action === "test_storage") {
      const provider = await getConfigValue("storage.provider");
      if (provider === "local") {
        const fs = await import("fs");
        const path = await getConfigValue("storage.local_path") || "uploads/";
        try {
          if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
          }
          fs.accessSync(path, fs.constants.W_OK);
          return jsonOk({ success: true, message: "Local storage path is writable." });
        } catch {
          return jsonOk({ success: false, message: "Local storage path is not writable or does not exist." });
        }
      }
      // For cloud providers, just acknowledge (real test would need SDK)
      return jsonOk({ success: true, message: `Storage provider "${provider}" configuration saved. Full connectivity test requires provider SDK.` });
    }

    // ── Batch upsert config ────────────────────────────────
    const { configs } = body as { configs?: Record<string, string> };
    if (!configs || typeof configs !== "object") {
      return jsonError("configs object is required (key-value pairs)", 400);
    }

    const invalidKeys: string[] = [];
    const updates: { key: string; value: string }[] = [];

    for (const [key, value] of Object.entries(configs)) {
      if (!KNOWN_KEYS.has(key)) {
        invalidKeys.push(key);
        continue;
      }
      updates.push({ key, value: typeof value === "string" ? value : JSON.stringify(value) });
    }

    if (invalidKeys.length > 0) {
      return jsonError(`Unknown config keys: ${invalidKeys.join(", ")}`, 400);
    }

    // For sensitive keys, if value is masked (starts with ****), skip the update
    const filteredUpdates = updates.filter((u) => {
      if (SENSITIVE_KEYS.includes(u.key) && u.value.startsWith("****")) {
        return false;
      }
      return true;
    });

    // Upsert each config
    await Promise.all(
      filteredUpdates.map((u) =>
        prisma.systemConfig.upsert({
          where: { key: u.key },
          update: { value: JSON.stringify(u.value), updatedBy: user.id },
          create: { key: u.key, value: JSON.stringify(u.value), updatedBy: user.id },
        })
      )
    );

    return jsonOk({ success: true, message: `${filteredUpdates.length} config(s) updated.` });
  } catch (error) {
    console.error("Admin config POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ─── Helper: get a single config value ───────────────────────────────────────
async function getConfigValue(key: string): Promise<string> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  if (row) {
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  }
  return CONFIG_DEFAULTS[key] || "";
}
