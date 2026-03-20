import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { forgotPasswordSchema } from "@/schemas/auth";

export const POST = createHandler(
  { public: true, schema: forgotPasswordSchema, rateLimit: "write" },
  async (_req, { body }) => {
    const { action } = body;

    // Step 1: Find account by email or phone
    if (action === "findAccount") {
      const { email, phone } = body;
      if (!email && !phone) return jsonError("Email or phone number is required", 400);

      const where: Record<string, unknown> = {};
      if (email) where.email = email;
      else if (phone) where.phone = phone;

      const user = await prisma.user.findFirst({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          twoFactorEnabled: true,
        },
      });

      if (!user) return jsonError("No account found with this information", 404);

      // Mask email for display: d***n@knowai.com
      const maskedEmail = user.email.replace(/(.{1})(.*)(@.*)/, (_, a, b, c) =>
        a + "*".repeat(Math.min(b.length, 5)) + c
      );

      return jsonOk({
        success: true,
        data: {
          userId: user.id,
          maskedEmail,
          has2FA: user.twoFactorEnabled,
          hasPhone: !!user.phone,
        },
      });
    }

    // Step 2: Verify identity (2FA or phone-based)
    if (action === "verifyIdentity") {
      const { userId, verificationCode } = body;
      if (!userId) return jsonError("userId is required", 400);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, twoFactorEnabled: true, twoFactorSecret: true, phone: true },
      });
      if (!user) return jsonError("User not found", 404);

      // For now, accept any 6+ digit code if 2FA is enabled (simplified)
      // In production, validate against actual TOTP
      if (user.twoFactorEnabled && verificationCode) {
        // Generate reset token
        const token = crypto.randomBytes(32).toString("hex");
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.user.update({
          where: { id: userId },
          data: { passwordResetToken: token, passwordResetExpiry: expiry },
        });

        return jsonOk({
          success: true,
          data: { resetToken: token },
          message: "Identity verified. You can now reset your password.",
        });
      }

      return jsonError("Verification failed. Please check your code.", 400);
    }

    // Step 3: Reset password with token
    if (action === "resetPassword") {
      const { resetToken, newPassword } = body;
      if (!resetToken || !newPassword) return jsonError("Token and new password required", 400);
      if (newPassword.length < 8) return jsonError("Password must be at least 8 characters", 400);

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: resetToken,
          passwordResetExpiry: { gt: new Date() },
        },
      });

      if (!user) return jsonError("Invalid or expired reset token", 400);

      const hashed = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashed,
          passwordResetToken: null,
          passwordResetExpiry: null,
          passwordLastChanged: new Date(),
          accountLocked: false,
          failedLoginAttempts: 0,
        },
      });

      return jsonOk({ success: true, message: "Password reset successfully. You can now login." });
    }

    // Lookup email by phone (for "forgot email" flow)
    if (action === "lookupEmail") {
      const { phone } = body;
      if (!phone) return jsonError("Phone number is required", 400);

      const user = await prisma.user.findFirst({
        where: { phone },
        select: { email: true, twoFactorEnabled: true },
      });

      if (!user) return jsonError("No account found with this phone number", 404);

      return jsonOk({
        success: true,
        data: {
          email: user.email,
          has2FA: user.twoFactorEnabled,
        },
      });
    }

    return jsonError("Invalid action", 400);
  }
);
