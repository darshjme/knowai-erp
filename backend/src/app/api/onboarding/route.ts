import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { isProfileComplete } from "@/lib/profile-complete";
import { uploadFile } from "@/lib/storage";

/**
 * Onboarding API — 4-step wizard with save/resume.
 *
 *   GET  → returns saved progress (step + fields)
 *   PATCH → saves partial progress per step (no files)
 *   POST  → completes onboarding (with file uploads)
 *
 *   Step 0: Personal (dateOfBirth, phone, bio)
 *   Step 1: Professional (department, designation, skills, linkedin)
 *   Step 2: Security (secretQuestion, secretAnswer)
 *   Step 3: Documents (resume, govId, profilePhoto)
 */

// ─── GET: Return saved onboarding progress ──────────────────────────────────

export const GET = createHandler({}, async (_req: NextRequest, { user }) => {
  return jsonOk({
    success: true,
    data: {
      onboardingComplete: user.onboardingComplete,
      onboardingStep: user.onboardingStep,
      profileComplete: user.profileComplete,
      profileDeadline: user.profileDeadline,
      dateOfBirth: user.dateOfBirth,
      bio: user.bio,
      phone: user.phone,
      department: user.department,
      designation: user.designation,
      skills: user.skills,
      linkedinUrl: user.linkedinUrl,
      secretQuestion: user.secretQuestion,
      resumeUrl: user.resumeUrl,
      companyEmail: user.companyEmail,
      avatar: user.avatar,
      address: user.address,
      city: user.city,
      state: user.state,
      country: user.country,
      pincode: user.pincode,
      alternateEmail: user.alternateEmail,
      about: user.about,
      twitterUrl: user.twitterUrl,
      githubUrl: user.githubUrl,
      instagramUrl: user.instagramUrl,
      websiteUrl: user.websiteUrl,
    },
  });
});

// ─── PATCH: Save partial progress (per step, no files) ──────────────────────

export const PATCH = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const body = await req.json();
  const { step, ...fields } = body;

  if (typeof step !== "number" || step < 0 || step > 3) {
    return jsonError("Invalid step number (0-3)", 400);
  }

  const updateData: Record<string, unknown> = {
    onboardingStep: step,
  };

  // Save fields based on step
  if (fields.dateOfBirth) updateData.dateOfBirth = new Date(fields.dateOfBirth);
  if (fields.bio !== undefined) updateData.bio = fields.bio;
  if (fields.phone !== undefined) updateData.phone = fields.phone;
  if (fields.department !== undefined) updateData.department = fields.department;
  if (fields.designation !== undefined) updateData.designation = fields.designation;
  if (fields.skills !== undefined) updateData.skills = fields.skills;
  if (fields.linkedinUrl !== undefined) updateData.linkedinUrl = fields.linkedinUrl;
  if (fields.secretQuestion !== undefined) updateData.secretQuestion = fields.secretQuestion;
  if (fields.address !== undefined) updateData.address = fields.address;
  if (fields.city !== undefined) updateData.city = fields.city;
  if (fields.state !== undefined) updateData.state = fields.state;
  if (fields.country !== undefined) updateData.country = fields.country;
  if (fields.pincode !== undefined) updateData.pincode = fields.pincode;
  if (fields.alternateEmail !== undefined) updateData.alternateEmail = fields.alternateEmail;
  if (fields.about !== undefined) updateData.about = fields.about;

  // Hash secret answer if provided during save
  if (fields.secretAnswer) {
    updateData.secretAnswer = await bcrypt.hash(fields.secretAnswer, 12);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return jsonOk({ success: true, message: `Step ${step} saved`, step });
});

// ─── POST: Complete onboarding (with file uploads) ──────────────────────────

export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const contentType = req.headers.get("content-type") || "";

  let fields: Record<string, string | undefined> = {};
  let resumeFile: File | null = null;
  let govIdFile: File | null = null;
  let profilePhotoFile: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (key === "resume") resumeFile = value;
        else if (key === "govId") govIdFile = value;
        else if (key === "profilePhoto") profilePhotoFile = value;
      } else {
        fields[key] = value as string;
      }
    }
  } else {
    fields = await req.json();
  }

  // Validate required fields
  if (!fields.secretQuestion || !fields.secretAnswer) {
    return jsonError("Secret question and answer are required", 400);
  }

  const hashedSecretAnswer = await bcrypt.hash(fields.secretAnswer, 12);

  // ── File uploads ──
  const allowedDocTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  let resumeUrl: string | null = null;
  let govIdUrl: string | null = null;
  let avatarUrl: string | null = null;

  // Resume
  if (resumeFile && resumeFile.size > 0) {
    if (resumeFile.size > MAX_FILE_SIZE) {
      return jsonError("Resume must be under 10MB", 400);
    }
    if (!allowedDocTypes.includes(resumeFile.type)) {
      return jsonError("Resume must be a PDF or DOCX file", 400);
    }
    resumeUrl = await saveFile(resumeFile, "resumes", user.id);
  }

  // Gov ID
  if (govIdFile && govIdFile.size > 0) {
    if (govIdFile.size > MAX_FILE_SIZE) {
      return jsonError("Government ID must be under 10MB", 400);
    }
    if (![...allowedDocTypes, ...allowedImageTypes].includes(govIdFile.type)) {
      return jsonError("Government ID must be a PDF, DOCX, or image file", 400);
    }
    govIdUrl = await saveFile(govIdFile, "gov-ids", user.id);
  }

  // Profile photo
  if (profilePhotoFile && profilePhotoFile.size > 0) {
    if (profilePhotoFile.size > 5 * 1024 * 1024) {
      return jsonError("Profile photo must be under 5MB", 400);
    }
    if (!allowedImageTypes.includes(profilePhotoFile.type)) {
      return jsonError("Profile photo must be a JPEG, PNG, WebP, or GIF image", 400);
    }
    avatarUrl = await saveFile(profilePhotoFile, "avatars", user.id);
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    onboardingComplete: true,
    onboardingStep: 3,
    secretQuestion: fields.secretQuestion,
    secretAnswer: hashedSecretAnswer,
  };

  if (fields.dateOfBirth) updateData.dateOfBirth = new Date(fields.dateOfBirth);
  if (fields.bio) updateData.bio = fields.bio;
  if (fields.phone) updateData.phone = fields.phone;
  if (fields.department) updateData.department = fields.department;
  if (fields.designation) updateData.designation = fields.designation;
  if (fields.skills) updateData.skills = fields.skills;
  if (fields.linkedinUrl) updateData.linkedinUrl = fields.linkedinUrl;
  if (resumeUrl) updateData.resumeUrl = resumeUrl;
  if (govIdUrl) updateData.govIdUrl = govIdUrl;
  if (avatarUrl) updateData.avatar = avatarUrl;
  if (fields.address) updateData.address = fields.address;
  if (fields.city) updateData.city = fields.city;
  if (fields.state) updateData.state = fields.state;
  if (fields.country) updateData.country = fields.country;
  if (fields.pincode) updateData.pincode = fields.pincode;
  if (fields.alternateEmail) updateData.alternateEmail = fields.alternateEmail;
  if (fields.about) updateData.about = fields.about;
  if (fields.twitterUrl) updateData.twitterUrl = fields.twitterUrl;
  if (fields.githubUrl) updateData.githubUrl = fields.githubUrl;
  if (fields.instagramUrl) updateData.instagramUrl = fields.instagramUrl;
  if (fields.websiteUrl) updateData.websiteUrl = fields.websiteUrl;

  // Check profileComplete using shared function
  const profileFields = {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: fields.phone || user.phone,
    address: fields.address || user.address,
    city: fields.city || user.city,
    country: fields.country || user.country,
    about: fields.about || user.about,
    alternateEmail: fields.alternateEmail || user.alternateEmail,
  };
  updateData.profileComplete = isProfileComplete(profileFields);

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    include: { workspace: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {
    password: _,
    secretAnswer: _sa,
    twoFactorSecret: _tfs,
    passwordResetToken: _prt,
    passwordResetExpiry: _pre,
    ...userWithoutSensitive
  } = updatedUser;

  return jsonOk({
    success: true,
    message: "Onboarding completed successfully",
    data: { user: userWithoutSensitive },
  });
});

// ─── Helper: Save uploaded file to cloud / local storage ─────────────────────

async function saveFile(
  file: File,
  subDir: string,
  userId: string
): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const sanitizedExt = ext.replace(/[^a-zA-Z0-9]/g, "");
  const key = `${subDir}/${userId}-${Date.now()}.${sanitizedExt}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadFile(key, buffer, file.type);
}
