import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

// Mandatory fields for profile completion
const MANDATORY_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "address",
  "city",
  "country",
  "about",
  "alternateEmail",
] as const;

// All trackable fields (mandatory + optional) for completion percentage
const ALL_PROFILE_FIELDS = [
  ...MANDATORY_FIELDS,
  "state",
  "pincode",
  "dateOfBirth",
  "skills",
  "linkedinUrl",
  "twitterUrl",
  "githubUrl",
  "instagramUrl",
  "websiteUrl",
  "bio",
] as const;

function calculateCompletion(user: Record<string, unknown>): number {
  let filled = 0;
  for (const field of ALL_PROFILE_FIELDS) {
    const val = user[field];
    if (val !== null && val !== undefined && val !== "") {
      filled++;
    }
  }
  return Math.round((filled / ALL_PROFILE_FIELDS.length) * 100);
}

// Use shared profileComplete logic — single source of truth
import { isProfileComplete } from "@/lib/profile-complete";

function areMandatoryFieldsFilled(user: Record<string, unknown>): boolean {
  return isProfileComplete(user as { firstName?: string | null; lastName?: string | null; phone?: string | null; address?: string | null; city?: string | null; country?: string | null; about?: string | null; alternateEmail?: string | null });
}

export const GET = createHandler({}, async (_req: NextRequest, { user }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    return jsonError("User not found", 404);
  }

  const completionPercent = calculateCompletion(dbUser as unknown as Record<string, unknown>);

  // Calculate days remaining
  let daysRemaining: number | null = null;
  if (dbUser.profileDeadline) {
    const now = new Date();
    const deadline = new Date(dbUser.profileDeadline);
    const diffMs = deadline.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return jsonOk({
    success: true,
    data: {
      profileComplete: dbUser.profileComplete,
      profileDeadline: dbUser.profileDeadline,
      daysRemaining,
      completionPercent,
      profile: {
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        email: dbUser.email,
        companyEmail: dbUser.companyEmail,
        phone: dbUser.phone,
        dateOfBirth: dbUser.dateOfBirth,
        department: dbUser.department,
        designation: dbUser.designation,
        address: dbUser.address,
        city: dbUser.city,
        state: dbUser.state,
        country: dbUser.country,
        pincode: dbUser.pincode,
        avatar: dbUser.avatar,
        alternateEmail: dbUser.alternateEmail,
        about: dbUser.about,
        bio: dbUser.bio,
        skills: dbUser.skills,
        linkedinUrl: dbUser.linkedinUrl,
        twitterUrl: dbUser.twitterUrl,
        githubUrl: dbUser.githubUrl,
        instagramUrl: dbUser.instagramUrl,
        websiteUrl: dbUser.websiteUrl,
        portfolioUrl: dbUser.portfolioUrl,
        verified: dbUser.verified,
        verifiedAt: dbUser.verifiedAt,
      },
    },
  });
});

export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const body = await req.json();

  // Build update data from allowed fields
  const updateData: Record<string, unknown> = {};

  const stringFields = [
    "firstName", "lastName", "phone", "address", "city", "state",
    "country", "pincode", "alternateEmail", "about", "bio", "skills",
    "linkedinUrl", "twitterUrl", "githubUrl", "instagramUrl", "websiteUrl",
    "portfolioUrl", "department", "designation", "avatar",
  ];

  for (const field of stringFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field] || null;
    }
  }

  if (body.dateOfBirth) {
    updateData.dateOfBirth = new Date(body.dateOfBirth);
  }

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  // Check if all mandatory fields are now filled
  const userRecord = updatedUser as unknown as Record<string, unknown>;
  const mandatoryFilled = areMandatoryFieldsFilled(userRecord);

  if (mandatoryFilled && !updatedUser.profileComplete) {
    await prisma.user.update({
      where: { id: user.id },
      data: { profileComplete: true },
    });
  } else if (!mandatoryFilled && updatedUser.profileComplete) {
    await prisma.user.update({
      where: { id: user.id },
      data: { profileComplete: false },
    });
  }

  const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
  const completionPercent = calculateCompletion(finalUser as unknown as Record<string, unknown>);

  let daysRemaining: number | null = null;
  if (finalUser?.profileDeadline) {
    const now = new Date();
    const deadline = new Date(finalUser.profileDeadline);
    const diffMs = deadline.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return jsonOk({
    success: true,
    message: mandatoryFilled
      ? "Profile completed successfully!"
      : "Profile saved. Please fill all mandatory fields to complete your profile.",
    data: {
      profileComplete: finalUser?.profileComplete,
      completionPercent,
      daysRemaining,
    },
  });
});
