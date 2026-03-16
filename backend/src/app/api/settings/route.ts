import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { password, ...profile } = user;

    // Also fetch user preferences (create default if none exist)
    let preferences = await prisma.userPreference.findUnique({
      where: { userId: user.id },
    });

    if (!preferences) {
      preferences = await prisma.userPreference.create({
        data: { userId: user.id },
      });
    }

    return jsonOk({
      ...profile,
      workspaceName: user.workspace?.name ?? null,
      preferences,
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }
    const { firstName, lastName, phone, department, currentPassword, newPassword } = body as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      department?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    // Handle password change
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return jsonError("Both currentPassword and newPassword are required", 400);
      }

      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return jsonError("Password must be at least 8 characters", 400);
      }

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return jsonError("Current password is incorrect", 400);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(firstName !== undefined && { firstName: String(firstName).trim() }),
          ...(lastName !== undefined && { lastName: String(lastName).trim() }),
          ...(phone !== undefined && { phone: String(phone).trim() }),
          ...(department !== undefined && { department: String(department).trim() }),
          password: hashedPassword,
        },
        include: { workspace: true },
      });

      const { password: _, ...result } = updated;
      return jsonOk(result);
    }

    // Profile-only update -- validate fields
    if (firstName !== undefined && typeof firstName === "string" && firstName.trim().length === 0) {
      return jsonError("First name cannot be empty", 400);
    }
    if (lastName !== undefined && typeof lastName === "string" && lastName.trim().length === 0) {
      return jsonError("Last name cannot be empty", 400);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(firstName !== undefined && { firstName: String(firstName).trim() }),
        ...(lastName !== undefined && { lastName: String(lastName).trim() }),
        ...(phone !== undefined && { phone: String(phone).trim() }),
        ...(department !== undefined && { department: String(department).trim() }),
      },
      include: { workspace: true },
    });

    const { password: _, ...result } = updated;
    return jsonOk(result);
  } catch (error) {
    console.error("PATCH /api/settings error:", error);
    return jsonError("Internal server error", 500);
  }
}
