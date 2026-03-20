import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { twoFactorActionSchema } from "@/schemas/auth";
import crypto from "crypto";

// Generate a simple secret for 2FA
function generateSecret(): string {
  return crypto.randomBytes(20).toString("hex");
}

function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

export const GET = createHandler(
  {},
  async (_req, { user }) => {
    return jsonOk({
      success: true,
      data: {
        twoFactorEnabled: user.twoFactorEnabled || false,
      },
    });
  }
);

export const POST = createHandler(
  { schema: twoFactorActionSchema, rateLimit: "write" },
  async (_req, { user, body }) => {
    const { action } = body;

    if (action === "enable") {
      const secret = generateSecret();
      const backupCodes = generateBackupCodes();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: JSON.stringify({ secret, backupCodes, enabledAt: new Date() }),
        },
      });

      return jsonOk({
        success: true,
        message: "Two-factor authentication enabled",
        data: { backupCodes },
      });
    }

    if (action === "disable") {
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });

      return jsonOk({ success: true, message: "Two-factor authentication disabled" });
    }

    return jsonError("Invalid action", 400);
  }
);
