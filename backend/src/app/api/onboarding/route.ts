import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return jsonError("Authentication required", 401);
    }

    return jsonOk({
      success: true,
      data: {
        onboardingComplete: authUser.onboardingComplete,
        dateOfBirth: authUser.dateOfBirth,
        bio: authUser.bio,
        phone: authUser.phone,
        department: authUser.department,
        designation: authUser.designation,
        secretQuestion: authUser.secretQuestion,
        resumeUrl: authUser.resumeUrl,
        companyEmail: authUser.companyEmail,
      },
    });
  } catch (error) {
    console.error("Onboarding GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return jsonError("Authentication required", 401);
    }

    const contentType = req.headers.get("content-type") || "";
    let dateOfBirth: string | undefined;
    let bio: string | undefined;
    let secretQuestion: string | undefined;
    let secretAnswer: string | undefined;
    let phone: string | undefined;
    let department: string | undefined;
    let designation: string | undefined;
    let resumeFile: File | null = null;

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
    } else {
      const body = await req.json();
      dateOfBirth = body.dateOfBirth;
      bio = body.bio;
      secretQuestion = body.secretQuestion;
      secretAnswer = body.secretAnswer;
      phone = body.phone;
      department = body.department;
      designation = body.designation;
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
      const fileName = `${authUser.id}-resume-${Date.now()}.${ext}`;
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

    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
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
  } catch (error) {
    console.error("Onboarding POST error:", error);
    return jsonError("Internal server error", 500);
  }
}
