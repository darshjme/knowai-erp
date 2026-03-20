import prisma from "@/lib/prisma";
import { createHandler, jsonOk } from "@/lib/create-handler";

const isProduction = process.env.NODE_ENV === "production";

export const POST = createHandler(
  { public: true },
  async (req) => {
    // Attempt to identify the user and set status to OFFLINE
    // We import getAuthUser here because the wrapper skips auth for public routes
    const { getAuthUser } = await import("@/lib/api-utils");
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
  }
);
