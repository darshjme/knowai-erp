import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import crypto from "crypto";

// Generate a simple 6-digit code-based 2FA
function generateSecret(): string {
  return crypto.randomBytes(20).toString("hex");
}

function generateBackupCodes(): string[] {
  return Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    return jsonOk({
      success: true,
      data: {
        twoFactorEnabled: user.twoFactorEnabled || false,
      },
    });
  } catch (error) {
    console.error("2FA GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { action } = await req.json();

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
  } catch (error) {
    console.error("2FA POST error:", error);
    return jsonError("Internal server error", 500);
  }
}
