import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) return jsonError("Both passwords required", 400);
    if (newPassword.length < 8) return jsonError("Password must be at least 8 characters", 400);

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return jsonError("Current password is incorrect", 401);

    // Hash and update
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return jsonOk({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return jsonError("Internal server error", 500);
  }
}
