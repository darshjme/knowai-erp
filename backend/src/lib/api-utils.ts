import { NextResponse } from "next/server";
import { verifyToken } from "./auth";
import prisma from "./prisma";

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getAuthFromHeaders(req: Request) {
  const userId = req.headers.get("x-user-id");
  const email = req.headers.get("x-user-email");
  const role = req.headers.get("x-user-role");
  const workspaceId = req.headers.get("x-workspace-id");
  if (!userId || !email || !role) return null;
  return { userId, email, role, workspaceId };
}

export async function getAuthUser(req: Request) {
  const fromHeaders = getAuthFromHeaders(req);
  if (fromHeaders) {
    return prisma.user.findUnique({
      where: { id: fromHeaders.userId },
      include: { workspace: true },
    });
  }
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/token=([^;]+)/);
  if (!match) return null;
  try {
    const payload = await verifyToken(match[1]);
    if (!payload) return null;
    return prisma.user.findUnique({ where: { id: payload.userId }, include: { workspace: true } });
  } catch {
    return null;
  }
}
