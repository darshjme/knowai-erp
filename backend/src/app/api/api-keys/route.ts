import { getAuthUser, jsonOk, jsonError } from "@/lib/api-utils";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// GET /api/api-keys - List all API keys for the authenticated user
export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        key: true, // In production, you might want to mask this
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
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return jsonError("Failed to fetch API keys", 500);
  }
}

// POST /api/api-keys - Create a new API key
export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const { name, scopes, expiresInDays } = body;

    if (!name || !scopes || !Array.isArray(scopes)) {
      return jsonError("Name and scopes are required", 400);
    }

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
  } catch (error) {
    console.error("Error creating API key:", error);
    return jsonError("Failed to create API key", 500);
  }
}

// PATCH /api/api-keys - Update API key scopes
export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const { id, scopes } = body;

    if (!id || !scopes || !Array.isArray(scopes)) {
      return jsonError("ID and scopes are required", 400);
    }

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
  } catch (error) {
    console.error("Error updating API key:", error);
    return jsonError("Failed to update API key", 500);
  }
}

// DELETE /api/api-keys?id=xxx - Revoke (delete) an API key
export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return jsonError("Unauthorized", 401);
    }

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
  } catch (error) {
    console.error("Error deleting API key:", error);
    return jsonError("Failed to delete API key", 500);
  }
}
