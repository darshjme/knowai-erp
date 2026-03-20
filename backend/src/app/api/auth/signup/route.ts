import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { adminCreateUserSchema } from "@/schemas/auth";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";

// Only these roles can create new users (no public signup)
const ALLOWED_CREATOR_ROLES = ["ADMIN", "HR", "CEO"];

export const POST = createHandler(
  { schema: adminCreateUserSchema, roles: ALLOWED_CREATOR_ROLES, rateLimit: "write" },
  async (_req, { user: authUser, body }) => {
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
    } = body;

    // Validate role if provided
    const assignedRole = role || "GUY";

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

    // Auto-generate companyEmail: firstname.lastname@knowai.biz
    const baseCompanyEmail = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}@knowai.biz`;
    let companyEmail = baseCompanyEmail;
    let emailSuffix = 2;
    while (await prisma.user.findUnique({ where: { companyEmail } })) {
      companyEmail = `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}${emailSuffix}@knowai.biz`;
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
        profileComplete: false,
        profileDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        companyEmail,
      },
      include: { workspace: true },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    // Fire-and-forget: send welcome email to employee's personal email
    sendEmail(
      email,
      "Welcome to KnowAI — Your Account is Ready",
      welcomeEmailHtml(`${firstName} ${lastName}`, companyEmail, password)
    ).catch((err) => {
      console.error(`[SIGNUP] Failed to send welcome email to ${email}:`, err);
    });

    // Return the created user (no auto-login token — the new user is not the caller)
    return jsonOk(
      {
        success: true,
        message: `User ${firstName} ${lastName} created with role ${assignedRole}`,
        data: { user: userWithoutPassword },
      },
      201
    );
  }
);
