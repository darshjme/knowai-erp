import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { passwordManagementSchema } from "@/schemas/admin";
import bcrypt from "bcryptjs";

const ALLOWED_ROLES = ["CTO", "CEO", "ADMIN", "HR"];

// ── GET: List users with password status ─────────────────────────────────

export const GET = createHandler(
  { roles: ALLOWED_ROLES },
  async (req, { user }) => {
    const users = await prisma.user.findMany({
      where: { workspaceId: user.workspaceId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        avatar: true,
        status: true,
        passwordResetRequired: true,
        passwordLastChanged: true,
        accountLocked: true,
        accountLockedUntil: true,
        failedLoginAttempts: true,
        lastActiveAt: true,
        createdAt: true,
      },
      orderBy: { firstName: "asc" },
    });

    const userList = users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
      department: u.department,
      avatar: u.avatar,
      status: u.status,
      passwordLastChanged: u.passwordLastChanged,
      passwordResetRequired: u.passwordResetRequired,
      accountLocked: u.accountLocked,
      accountLockedUntil: u.accountLockedUntil,
      failedLoginAttempts: u.failedLoginAttempts,
      lastActiveAt: u.lastActiveAt,
      createdAt: u.createdAt,
    }));

    return jsonOk({ users: userList });
  }
);

// ── POST: HR actions on user passwords ───────────────────────────────────

export const POST = createHandler(
  { roles: ALLOWED_ROLES, schema: passwordManagementSchema, rateLimit: "write" },
  async (req, { user, body }) => {
    const { action, userId } = body;

    // Verify the target user exists and belongs to the same workspace
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, workspaceId: user.workspaceId },
    });

    if (!targetUser) return jsonError("User not found", 404);

    switch (action) {
      case "resetPassword": {
        // Generate a temporary password
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 12);

        await prisma.user.update({
          where: { id: userId },
          data: {
            password: hashedPassword,
            passwordResetRequired: true,
            passwordLastChanged: new Date(),
            failedLoginAttempts: 0,
            accountLocked: false,
            accountLockedUntil: null,
          },
        });

        return jsonOk({
          message: "Password reset successfully",
          tempPassword,
          note: "Share this temporary password securely with the employee. They will be required to change it on next login.",
        });
      }

      case "unlockAccount": {
        await prisma.user.update({
          where: { id: userId },
          data: {
            accountLocked: false,
            accountLockedUntil: null,
            failedLoginAttempts: 0,
          },
        });

        return jsonOk({
          message: "Account unlocked successfully",
        });
      }

      case "forceChangePassword": {
        await prisma.user.update({
          where: { id: userId },
          data: {
            passwordResetRequired: true,
          },
        });

        return jsonOk({
          message: "User will be required to change their password on next login",
        });
      }

      default:
        return jsonError(`Unknown action: ${action}. Supported: resetPassword, unlockAccount, forceChangePassword`, 400);
    }
  }
);

// ── Helper: Generate a temp password ─────────────────────────────────────

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
