import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { changePasswordSchema } from "@/schemas/auth";

export const POST = createHandler(
  { schema: changePasswordSchema, rateLimit: "write" },
  async (_req, { user, body }) => {
    const { currentPassword, newPassword } = body;

    if (newPassword.length < 8) return jsonError("Password must be at least 8 characters", 400);

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return jsonError("Current password is incorrect", 401);

    // Hash and update
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return jsonOk({ success: true, message: "Password changed successfully" });
  }
);
