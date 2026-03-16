import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
// auth utilities not needed here — signup does not issue tokens
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

// All 16 valid roles in the system
const VALID_ROLES = [
  "CEO", "CTO", "CFO", "BRAND_FACE", "ADMIN", "HR",
  "ACCOUNTING", "PRODUCT_OWNER", "CONTENT_STRATEGIST", "BRAND_PARTNER",
  "SR_DEVELOPER", "EDITOR", "GRAPHIC_DESIGNER", "JR_DEVELOPER",
  "GUY", "OFFICE_BOY",
] as const;

// Only these roles can create new users (no public signup)
const ALLOWED_CREATOR_ROLES = ["ADMIN", "HR", "CEO"];

export async function POST(req: NextRequest) {
  try {
    // ── Authentication: caller must be logged in ──
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return jsonError("Authentication required. Only ADMIN or HR can create users.", 401);
    }

    // ── Authorization: only ADMIN, HR, or CEO can create users ──
    if (!ALLOWED_CREATOR_ROLES.includes(authUser.role)) {
      return jsonError(
        "Access denied. Only ADMIN, HR, or CEO roles can create new users.",
        403
      );
    }

    const {
      email,
      password,
      firstName,
      lastName,
      role,
      designation,
      department,
      phone,
      salary,
      reportingTo,
      workspaceId,
    } = await req.json();

    // ── Validation ──
    if (!email || !password || !firstName || !lastName) {
      return jsonError("email, password, firstName, and lastName are required", 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return jsonError("Invalid email format", 400);
    }

    if (password.length < 8) {
      return jsonError("Password must be at least 8 characters", 400);
    }

    // Validate role if provided
    const assignedRole = role || "GUY";
    if (!VALID_ROLES.includes(assignedRole)) {
      return jsonError(
        `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
        400
      );
    }

    // Prevent non-CEO from assigning C-suite roles
    const C_SUITE_ROLES = ["CEO", "CTO", "CFO"];
    if (C_SUITE_ROLES.includes(assignedRole) && authUser.role !== "CEO") {
      return jsonError(
        "Only the CEO can assign C-suite roles (CEO, CTO, CFO).",
        403
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError("Email already in use", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Auto-generate companyEmail: firstname.lastname@knowai.com
    const baseCompanyEmail = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}@knowai.com`;
    let companyEmail = baseCompanyEmail;
    let emailSuffix = 2;
    while (await prisma.user.findUnique({ where: { companyEmail } })) {
      companyEmail = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}${emailSuffix}@knowai.com`;
      emailSuffix++;
    }

    // Resolve workspace: use provided workspaceId, fall back to creator's workspace
    let targetWorkspaceId = workspaceId || authUser.workspaceId;

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: targetWorkspaceId },
    });

    if (!workspace) {
      // Fall back to any existing workspace
      const fallback = await prisma.workspace.findFirst();
      if (!fallback) {
        return jsonError("No workspace available. Create a workspace first.", 400);
      }
      targetWorkspaceId = fallback.id;
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: assignedRole,
        designation: designation || null,
        department: department || null,
        phone: phone || null,
        salary: salary || null,
        reportingTo: reportingTo || null,
        workspaceId: targetWorkspaceId,
        status: "OFFLINE",
        onboardingComplete: false,
        companyEmail,
      },
      include: { workspace: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    // Return the created user (no auto-login token — the new user is not the caller)
    return jsonOk(
      {
        success: true,
        message: `User ${firstName} ${lastName} created with role ${assignedRole}`,
        data: { user: userWithoutPassword },
      },
      201
    );
  } catch (error) {
    console.error("Signup error:", error);
    return jsonError("Internal server error", 500);
  }
}
