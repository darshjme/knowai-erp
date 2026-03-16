import { NextRequest } from "next/server";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";
import prisma from "@/lib/prisma";

const isProduction = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  try {
    // Attempt to identify the user and set status to OFFLINE
    const user = await getAuthUser(req);

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: "OFFLINE" },
      });
    }

    const response = jsonOk({
      success: true,
      message: "Logged out successfully",
    });

    // Clear the auth cookie
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    // Even if something fails, still clear the cookie so the client is logged out
    const response = jsonOk({
      success: true,
      message: "Logged out",
    });

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  }
}
