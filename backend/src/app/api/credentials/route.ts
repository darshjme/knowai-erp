import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

// Roles with full credential access
const C_LEVEL = ["CEO", "CTO", "ADMIN"];
const CREATE_ROLES = ["CEO", "CTO", "ADMIN", "HR", "PRODUCT_OWNER"];

// Simple encode/decode (production: replace with AES-256-GCM)
function encryptPassword(plain: string): string {
  return Buffer.from(plain, "utf-8").toString("base64");
}
function decryptPassword(encoded: string): string {
  try {
    return Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return encoded;
  }
}

// ── GET ──────────────────────────────────────────────────────────────────
export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  // ── Access Logs (C-level report) ──
  if (action === "logs") {
    if (!C_LEVEL.includes(user.role)) {
      return jsonError("Only C-level can view access logs", 403);
    }

    const logs = await prisma.credentialAccessLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Enrich with user + credential info
    const userIds = [...new Set(logs.map((l) => l.userId))];
    const credIds = [...new Set(logs.map((l) => l.credentialId))];

    const [users, creds] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      }),
      prisma.credential.findMany({
        where: { id: { in: credIds } },
        select: { id: true, title: true, category: true },
      }),
    ]);

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const credMap = Object.fromEntries(creds.map((c) => [c.id, c]));

    // Group: credential -> user -> action -> count + timestamps
    const grouped: Record<string, Record<string, Record<string, { count: number; timestamps: string[] }>>> = {};
    for (const log of logs) {
      const cKey = log.credentialId;
      const uKey = log.userId;
      const aKey = log.action;
      if (!grouped[cKey]) grouped[cKey] = {};
      if (!grouped[cKey][uKey]) grouped[cKey][uKey] = {};
      if (!grouped[cKey][uKey][aKey]) grouped[cKey][uKey][aKey] = { count: 0, timestamps: [] };
      grouped[cKey][uKey][aKey].count++;
      grouped[cKey][uKey][aKey].timestamps.push(log.createdAt.toISOString());
    }

    const report = Object.entries(grouped).map(([credId, users]) => ({
      credential: credMap[credId] || { id: credId, title: "Deleted" },
      users: Object.entries(users).map(([userId, actions]) => ({
        user: userMap[userId] || { id: userId, firstName: "Unknown", lastName: "" },
        actions: Object.entries(actions).map(([action, data]) => ({
          action,
          count: data.count,
          timestamps: data.timestamps.slice(0, 10),
        })),
      })),
    }));

    return jsonOk({ success: true, data: report });
  }

  // ── List credentials ──
  const category = searchParams.get("category");
  const projectId = searchParams.get("projectId");
  const search = searchParams.get("search");

  const isFullAccess = C_LEVEL.includes(user.role);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (!isFullAccess) {
    // Manager sees credentials they manage; others see granted or by accessLevel
    where.OR = [
      { createdById: user.id },
      { managedById: user.id },
      { accessGrants: { some: { userId: user.id } } },
      { accessLevel: "ALL_STAFF" },
      ...(["HR", "PRODUCT_OWNER", "CFO", "BRAND_FACE"].includes(user.role)
        ? [{ accessLevel: { in: ["MANAGER_AND_ABOVE", "TEAM_AND_ABOVE", "ALL_STAFF"] } }]
        : []),
      ...(user.role.startsWith("SR_")
        ? [{ accessLevel: { in: ["TEAM_AND_ABOVE", "ALL_STAFF"] } }]
        : []),
    ];
  }

  if (category && category !== "All") where.category = category;
  if (projectId) where.projectId = projectId;
  if (search) {
    const searchFilter = [
      { title: { contains: search, mode: "insensitive" } },
      { username: { contains: search, mode: "insensitive" } },
      { url: { contains: search, mode: "insensitive" } },
    ];
    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: searchFilter }];
      delete where.OR;
    } else {
      where.OR = searchFilter;
    }
  }

  const credentials = await prisma.credential.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      accessGrants: {
        select: { id: true, userId: true, canView: true, canCopy: true, canEdit: true, expiresAt: true, grantedById: true },
      },
      accessLogs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Decrypt passwords for response and add metadata
  const enriched = credentials.map((c) => ({
    ...c,
    password: decryptPassword(c.password),
    _grantsCount: c.accessGrants.length,
    _lastAccessed: c.accessLogs[0]?.createdAt || null,
  }));

  return jsonOk({ success: true, data: enriched });
});

// ── POST ─────────────────────────────────────────────────────────────────
export const POST = createHandler(
  { rateLimit: "write" },
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const { action } = body;

    // ── Grant Access ──
    if (action === "grantAccess") {
      const { credentialId, userId, canView, canCopy, canEdit, expiresAt } = body;
      if (!credentialId || !userId) return jsonError("credentialId and userId required", 400);

      const cred = await prisma.credential.findUnique({ where: { id: credentialId } });
      if (!cred) return jsonError("Credential not found", 404);

      // Only creator or C-level can grant
      if (cred.createdById !== user.id && !C_LEVEL.includes(user.role)) {
        return jsonError("Only credential creator or C-level can grant access", 403);
      }

      const grant = await prisma.credentialAccess.upsert({
        where: { credentialId_userId: { credentialId, userId } },
        update: {
          canView: canView ?? true,
          canCopy: canCopy ?? false,
          canEdit: canEdit ?? false,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          grantedById: user.id,
        },
        create: {
          credentialId,
          userId,
          grantedById: user.id,
          canView: canView ?? true,
          canCopy: canCopy ?? false,
          canEdit: canEdit ?? false,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });

      // Log the share action
      await prisma.credentialAccessLog.create({
        data: {
          credentialId,
          userId: user.id,
          action: "SHARE",
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        },
      });

      return jsonOk({ success: true, data: grant }, 201);
    }

    // ── Revoke Access ──
    if (action === "revokeAccess") {
      const { credentialId, userId } = body;
      if (!credentialId || !userId) return jsonError("credentialId and userId required", 400);

      const cred = await prisma.credential.findUnique({ where: { id: credentialId } });
      if (!cred) return jsonError("Credential not found", 404);

      if (cred.createdById !== user.id && !C_LEVEL.includes(user.role)) {
        return jsonError("Only credential creator or C-level can revoke access", 403);
      }

      await prisma.credentialAccess.deleteMany({
        where: { credentialId, userId },
      });

      return jsonOk({ success: true, message: "Access revoked" });
    }

    // ── Log Access ──
    if (action === "logAccess") {
      const { credentialId, accessAction } = body;
      if (!credentialId || !accessAction) return jsonError("credentialId and accessAction required", 400);

      const validActions = ["VIEW_PAGE", "COPY_PASSWORD", "COPY_USERNAME"];
      if (!validActions.includes(accessAction)) return jsonError("Invalid action", 400);

      await prisma.credentialAccessLog.create({
        data: {
          credentialId,
          userId: user.id,
          action: accessAction,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          userAgent: req.headers.get("user-agent") || null,
        },
      });

      return jsonOk({ success: true, message: "Access logged" });
    }

    // ── Create Credential ──
    if (!CREATE_ROLES.includes(user.role)) {
      return jsonError("Insufficient permissions to create credentials", 403);
    }

    const { title, username, password, url, category, notes, projectId, accessLevel } = body;
    if (!title || !password) return jsonError("title and password are required", 400);

    const credential = await prisma.credential.create({
      data: {
        title,
        username: username || null,
        password: encryptPassword(password),
        url: url || null,
        category: category || "Other",
        notes: notes || null,
        projectId: projectId || null,
        accessLevel: accessLevel || "ADMIN_ONLY",
        createdById: user.id,
        managedById: user.id,
        workspaceId: user.workspaceId || null,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        accessGrants: true,
        accessLogs: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    return jsonOk({
      success: true,
      data: {
        ...credential,
        password: decryptPassword(credential.password),
        _grantsCount: 0,
        _lastAccessed: null,
      },
    }, 201);
  }
);

// ── PATCH ────────────────────────────────────────────────────────────────
export const PATCH = createHandler(
  { rateLimit: "write" },
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const { id, title, username, password, url, category, notes, accessLevel, projectId } = body;
    if (!id) return jsonError("Credential id is required", 400);

    const existing = await prisma.credential.findUnique({ where: { id } });
    if (!existing) return jsonError("Credential not found", 404);

    // Only creator or C-level
    if (existing.createdById !== user.id && !C_LEVEL.includes(user.role)) {
      return jsonError("Only credential creator or C-level can update", 403);
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (username !== undefined) updates.username = username;
    if (password !== undefined) updates.password = encryptPassword(password);
    if (url !== undefined) updates.url = url;
    if (category !== undefined) updates.category = category;
    if (notes !== undefined) updates.notes = notes;
    if (accessLevel !== undefined) updates.accessLevel = accessLevel;
    if (projectId !== undefined) updates.projectId = projectId;

    const credential = await prisma.credential.update({
      where: { id },
      data: updates,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
        accessGrants: true,
        accessLogs: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });

    return jsonOk({
      success: true,
      data: {
        ...credential,
        password: decryptPassword(credential.password),
        _grantsCount: credential.accessGrants.length,
        _lastAccessed: credential.accessLogs[0]?.createdAt || null,
      },
    });
  }
);

// ── DELETE ───────────────────────────────────────────────────────────────
export const DELETE = createHandler(
  { rateLimit: "write" },
  async (req: NextRequest, { user }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("Credential id is required", 400);

    const existing = await prisma.credential.findUnique({ where: { id } });
    if (!existing) return jsonError("Credential not found", 404);

    if (existing.createdById !== user.id && !C_LEVEL.includes(user.role)) {
      return jsonError("Only credential creator or C-level can delete", 403);
    }

    await prisma.credential.delete({ where: { id } });

    return jsonOk({ success: true, message: "Credential deleted successfully" });
  }
);
