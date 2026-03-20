import { createHandler, jsonOk } from "@/lib/create-handler";
import prisma from "@/lib/prisma";

const ADMIN_ROLES = ["CEO", "CTO", "ADMIN", "HR"];

export const GET = createHandler(
  { roles: ADMIN_ROLES },
  async (_req, { user }) => {
    const now = new Date();

    const users = await prisma.user.findMany({
      where: { workspace: { id: user.workspaceId } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        companyEmail: true,
        role: true,
        department: true,
        onboardingComplete: true,
        onboardingStep: true,
        profileComplete: true,
        profileDeadline: true,
        accountDisabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const data = users.map((u) => {
      const daysRemaining = u.profileDeadline
        ? Math.max(0, Math.ceil((u.profileDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      let status: string;
      if (u.accountDisabled) status = "DISABLED";
      else if (u.profileComplete) status = "COMPLETE";
      else if (u.onboardingComplete) status = "PROFILE_PENDING";
      else status = "ONBOARDING_PENDING";

      return {
        ...u,
        daysRemaining,
        status,
      };
    });

    const summary = {
      total: data.length,
      complete: data.filter((d) => d.status === "COMPLETE").length,
      onboardingPending: data.filter((d) => d.status === "ONBOARDING_PENDING").length,
      profilePending: data.filter((d) => d.status === "PROFILE_PENDING").length,
      disabled: data.filter((d) => d.status === "DISABLED").length,
    };

    return jsonOk({ success: true, data, summary });
  }
);
