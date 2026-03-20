import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import crypto from "crypto";
import { z } from "zod";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
  expiresInDays: z.number().positive().optional(),
});

const updateApiKeySchema = z.object({
  id: z.string().min(1, "ID is required"),
  scopes: z.array(z.string()).min(1, "At least one scope is required"),
});

// GET /api/api-keys - List all API keys for the authenticated user
export const GET = createHandler({}, async (req: NextRequest, { user }) => {
  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      key: true,
      scopes: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  // Parse scopes from JSON string to array, with safe fallback
  const keysWithParsedScopes = apiKeys.map((key) => {
    let parsedScopes: string[] = [];
    try {
      parsedScopes = key.scopes ? JSON.parse(key.scopes) : [];
    } catch {
      parsedScopes = [];
    }
    return {
      ...key,
      scopes: Array.isArray(parsedScopes) ? parsedScopes : [],
      // Mask the key for security (show only last 4 chars)
      key: key.key ? `sk_...${key.key.slice(-4)}` : "sk_...",
      fullKey: key.key, // Include full key for copy functionality
    };
  });

  return jsonOk(keysWithParsedScopes);
});

// POST /api/api-keys - Create a new API key
export const POST = createHandler(
  { schema: createApiKeySchema, rateLimit: "write" },
  async (_req: NextRequest, { user, body }) => {
    const { name, scopes, expiresInDays } = body;

    // Generate a secure random API key
    const key = `sk_${crypto.randomBytes(32).toString("hex")}`;

    // Calculate expiration date if provided
    let expiresAt: Date | null = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        key,
        scopes: JSON.stringify(scopes),
        userId: user.id,
        expiresAt,
      },
    });

    let createdScopes: string[] = [];
    try {
      createdScopes = JSON.parse(apiKey.scopes);
    } catch {
      createdScopes = scopes;
    }

    return jsonOk({
      ...apiKey,
      scopes: Array.isArray(createdScopes) ? createdScopes : [],
    }, 201);
  }
);

// PATCH /api/api-keys - Update API key scopes
export const PATCH = createHandler(
  { schema: updateApiKeySchema, rateLimit: "write" },
  async (_req: NextRequest, { user, body }) => {
    const { id, scopes } = body;

    // Verify the key belongs to the user
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingKey) {
      return jsonError("API key not found", 404);
    }

    const updatedKey = await prisma.apiKey.update({
      where: { id },
      data: { scopes: JSON.stringify(scopes) },
    });

    let updatedScopes: string[] = [];
    try {
      updatedScopes = JSON.parse(updatedKey.scopes);
    } catch {
      updatedScopes = scopes;
    }

    return jsonOk({
      ...updatedKey,
      scopes: Array.isArray(updatedScopes) ? updatedScopes : [],
    });
  }
);

// DELETE /api/api-keys?id=xxx - Revoke (delete) an API key
export const DELETE = createHandler(
  { rateLimit: "write" },
  async (req: NextRequest, { user }) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return jsonError("ID is required", 400);
    }

    // Verify the key belongs to the user
    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingKey) {
      return jsonError("API key not found", 404);
    }

    await prisma.apiKey.delete({ where: { id } });

    return jsonOk({ success: true });
  }
);
