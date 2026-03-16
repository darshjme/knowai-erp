/**
 * Seed default system config values into the system_configs table.
 *
 * Usage:
 *   npx tsx scripts/seed-admin-config.ts
 *
 * Or via ts-node:
 *   npx ts-node --esm scripts/seed-admin-config.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  console.log("Seeding default system configs...\n");

  let created = 0;
  let skipped = 0;

  for (const [key, defaultValue] of Object.entries(CONFIG_DEFAULTS)) {
    const existing = await prisma.systemConfig.findUnique({ where: { key } });
    if (existing) {
      console.log(`  SKIP  ${key} (already exists)`);
      skipped++;
    } else {
      await prisma.systemConfig.create({
        data: {
          key,
          value: JSON.stringify(defaultValue),
          updatedBy: "system-seed",
        },
      });
      console.log(`  ADD   ${key} = ${JSON.stringify(defaultValue)}`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Total keys: ${Object.keys(CONFIG_DEFAULTS).length}`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
