import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

function getJwtSecret(): Uint8Array {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return new TextEncoder().encode(jwtSecret);
}

const secret = getJwtSecret();

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  workspaceId?: string;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

export async function signToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

export function requireRole(userRole: string, requiredRoles: string[]): void {
  if (!requiredRoles.includes(userRole)) {
    throw new Error("Access denied");
  }
}
