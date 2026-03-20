import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const GET = createHandler({}, async (_req: NextRequest, { user }) => {
  return jsonOk({
    success: true,
    data: {
      onboardingComplete: user.onboardingComplete,
      profileComplete: user.profileComplete,
      profileDeadline: user.profileDeadline,
      dateOfBirth: user.dateOfBirth,
      bio: user.bio,
      phone: user.phone,
      department: user.department,
      designation: user.designation,
      secretQuestion: user.secretQuestion,
      resumeUrl: user.resumeUrl,
      companyEmail: user.companyEmail,
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

export const POST = createHandler({ rateLimit: "write" }, async (req: NextRequest, { user }) => {
  const contentType = req.headers.get("content-type") || "";
  let dateOfBirth: string | undefined;
  let bio: string | undefined;
  let secretQuestion: string | undefined;
  let secretAnswer: string | undefined;
  let phone: string | undefined;
  let department: string | undefined;
  let designation: string | undefined;
  let resumeFile: File | null = null;
  let address: string | undefined;
  let city: string | undefined;
  let state: string | undefined;
  let country: string | undefined;
  let pincode: string | undefined;
  let alternateEmail: string | undefined;
  let about: string | undefined;
  let twitterUrl: string | undefined;
  let githubUrl: string | undefined;
  let instagramUrl: string | undefined;
  let websiteUrl: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    dateOfBirth = formData.get("dateOfBirth") as string | undefined;
    bio = formData.get("bio") as string | undefined;
    secretQuestion = formData.get("secretQuestion") as string | undefined;
    secretAnswer = formData.get("secretAnswer") as string | undefined;
    phone = formData.get("phone") as string | undefined;
    department = formData.get("department") as string | undefined;
    designation = formData.get("designation") as string | undefined;
    resumeFile = formData.get("resume") as File | null;
    address = formData.get("address") as string | undefined;
    city = formData.get("city") as string | undefined;
    state = formData.get("state") as string | undefined;
    country = formData.get("country") as string | undefined;
    pincode = formData.get("pincode") as string | undefined;
    alternateEmail = formData.get("alternateEmail") as string | undefined;
    about = formData.get("about") as string | undefined;
    twitterUrl = formData.get("twitterUrl") as string | undefined;
    githubUrl = formData.get("githubUrl") as string | undefined;
    instagramUrl = formData.get("instagramUrl") as string | undefined;
    websiteUrl = formData.get("websiteUrl") as string | undefined;
  } else {
    const body = await req.json();
    dateOfBirth = body.dateOfBirth;
    bio = body.bio;
    secretQuestion = body.secretQuestion;
    secretAnswer = body.secretAnswer;
    phone = body.phone;
    department = body.department;
    designation = body.designation;
    address = body.address;
    city = body.city;
    state = body.state;
    country = body.country;
    pincode = body.pincode;
    alternateEmail = body.alternateEmail;
    about = body.about;
    twitterUrl = body.twitterUrl;
    githubUrl = body.githubUrl;
    instagramUrl = body.instagramUrl;
    websiteUrl = body.websiteUrl;
  }

  // Validate required fields
  if (!secretQuestion || !secretAnswer) {
    return jsonError("Secret question and answer are required", 400);
  }

  // Hash secret answer
  const hashedSecretAnswer = await bcrypt.hash(secretAnswer, 12);

  // Handle resume upload
  let resumeUrl: string | null = null;
  if (resumeFile && resumeFile.size > 0) {
    // Validate file size (10MB max)
    if (resumeFile.size > 10 * 1024 * 1024) {
      return jsonError("Resume file must be under 10MB", 400);
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(resumeFile.type)) {
      return jsonError("Resume must be a PDF or DOCX file", 400);
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "resumes");
    await mkdir(uploadsDir, { recursive: true });

    const ext = resumeFile.name.split(".").pop();
    const fileName = `${user.id}-resume-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    await writeFile(filePath, buffer);

    resumeUrl = `/api/files/serve/${fileName}`;
  }

  // Build update data
  const updateData: Record<string, unknown> = {
    onboardingComplete: true,
    secretQuestion,
    secretAnswer: hashedSecretAnswer,
  };

  if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
  if (bio) updateData.bio = bio;
  if (phone) updateData.phone = phone;
  if (department) updateData.department = department;
  if (designation) updateData.designation = designation;
  if (resumeUrl) updateData.resumeUrl = resumeUrl;
  if (address) updateData.address = address;
  if (city) updateData.city = city;
  if (state) updateData.state = state;
  if (country) updateData.country = country;
  if (pincode) updateData.pincode = pincode;
  if (alternateEmail) updateData.alternateEmail = alternateEmail;
  if (about) updateData.about = about;
  if (twitterUrl) updateData.twitterUrl = twitterUrl;
  if (githubUrl) updateData.githubUrl = githubUrl;
  if (instagramUrl) updateData.instagramUrl = instagramUrl;
  if (websiteUrl) updateData.websiteUrl = websiteUrl;

  // Check if all mandatory profile fields are filled to mark profileComplete
  const updatedFirstName = user.firstName;
  const updatedLastName = user.lastName;
  const updatedPhone = phone || user.phone;
  const updatedAddress = address || user.address;
  const updatedCity = city || user.city;
  const updatedCountry = country || user.country;
  const updatedAbout = about || user.about;
  const updatedAltEmail = alternateEmail || user.alternateEmail;

  if (updatedFirstName && updatedLastName && updatedPhone && updatedAddress && updatedCity && updatedCountry && updatedAbout && updatedAltEmail) {
    updateData.profileComplete = true;
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    include: { workspace: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, secretAnswer: _sa, ...userWithoutSensitive } = updatedUser;

  return jsonOk({
    success: true,
    message: "Onboarding completed successfully",
    data: { user: userWithoutSensitive },
  });
});
