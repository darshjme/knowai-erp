import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

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

function areMandatoryFieldsFilled(user: Record<string, unknown>): boolean {
  for (const field of MANDATORY_FIELDS) {
    const val = user[field];
    if (!val || (typeof val === "string" && val.trim() === "")) {
      return false;
    }
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return jsonError("Authentication required", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    if (!user) {
      return jsonError("User not found", 404);
    }

    const completionPercent = calculateCompletion(user as unknown as Record<string, unknown>);

    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (user.profileDeadline) {
      const now = new Date();
      const deadline = new Date(user.profileDeadline);
      const diffMs = deadline.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }

    return jsonOk({
      success: true,
      data: {
        profileComplete: user.profileComplete,
        profileDeadline: user.profileDeadline,
        daysRemaining,
        completionPercent,
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          companyEmail: user.companyEmail,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          department: user.department,
          designation: user.designation,
          address: user.address,
          city: user.city,
          state: user.state,
          country: user.country,
          pincode: user.pincode,
          avatar: user.avatar,
          alternateEmail: user.alternateEmail,
          about: user.about,
          bio: user.bio,
          skills: user.skills,
          linkedinUrl: user.linkedinUrl,
          twitterUrl: user.twitterUrl,
          githubUrl: user.githubUrl,
          instagramUrl: user.instagramUrl,
          websiteUrl: user.websiteUrl,
          portfolioUrl: user.portfolioUrl,
          verified: user.verified,
          verifiedAt: user.verifiedAt,
        },
      },
    });
  } catch (error) {
    console.error("Profile setup GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return jsonError("Authentication required", 401);
    }

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
      where: { id: authUser.id },
      data: updateData,
    });

    // Check if all mandatory fields are now filled
    const userRecord = updatedUser as unknown as Record<string, unknown>;
    const mandatoryFilled = areMandatoryFieldsFilled(userRecord);

    if (mandatoryFilled && !updatedUser.profileComplete) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { profileComplete: true },
      });
    } else if (!mandatoryFilled && updatedUser.profileComplete) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { profileComplete: false },
      });
    }

    const finalUser = await prisma.user.findUnique({ where: { id: authUser.id } });
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
  } catch (error) {
    console.error("Profile setup POST error:", error);
    return jsonError("Internal server error", 500);
  }
}
