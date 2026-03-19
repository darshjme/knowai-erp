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
    const user = await prisma.user.findUnique({
      where: { id: fromHeaders.userId },
      include: { workspace: true },
    });
    // tokenVersion check: if the JWT was issued before a role change,
    // the embedded version won't match the DB version — reject as stale.
    if (user) {
      const tokenVersion = parseInt(req.headers.get("x-token-version") || "0", 10);
      if (tokenVersion < (user.tokenVersion ?? 0)) return null;
    }
    return user;
  }
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/token=([^;]+)/);
  if (!match) return null;
  try {
    const payload = await verifyToken(match[1]);
    if (!payload) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, include: { workspace: true } });
    // Check tokenVersion from JWT payload against DB
    if (user && (payload.tokenVersion ?? 0) < (user.tokenVersion ?? 0)) return null;
    return user;
  } catch {
    return null;
  }
}
