import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthFromHeaders } from "@/lib/api-utils";

// ─── GET: List user's favorites ordered by position ──────────
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req);
  if (!auth) return jsonError("Unauthorized", 401);

  try {
    const favorites = await prisma.userFavorite.findMany({
      where: { userId: auth.userId },
      orderBy: { position: "asc" },
    });

    return jsonOk({ success: true, data: favorites });
  } catch (err) {
    console.error("GET /api/favorites error:", err);
    return jsonError("Failed to fetch favorites", 500);
  }
}

// ─── POST: Add a favorite ────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req);
  if (!auth) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid JSON body");
    }

    const { entityType, entityId, entityName } = body;

    if (!entityType || typeof entityType !== "string" ||
        !entityId || typeof entityId !== "string" ||
        !entityName || typeof entityName !== "string") {
      return jsonError("entityType, entityId, and entityName are required strings");
    }

    const validTypes = ["project", "task", "client", "contact", "canvas", "goal"];
    if (!validTypes.includes(entityType)) {
      return jsonError(`entityType must be one of: ${validTypes.join(", ")}`);
    }

    // Get the next position value
    const maxPos = await prisma.userFavorite.aggregate({
      where: { userId: auth.userId },
      _max: { position: true },
    });
    const nextPosition = (maxPos._max.position ?? -1) + 1;

    const favorite = await prisma.userFavorite.upsert({
      where: {
        userId_entityType_entityId: {
          userId: auth.userId,
          entityType,
          entityId,
        },
      },
      update: { entityName },
      create: {
        userId: auth.userId,
        entityType,
        entityId,
        entityName,
        position: nextPosition,
      },
    });

    return jsonOk({ success: true, data: favorite }, 201);
  } catch (err) {
    console.error("POST /api/favorites error:", err);
    return jsonError("Failed to add favorite", 500);
  }
}

// ─── DELETE: Remove a favorite by entityType + entityId ──────
export async function DELETE(req: NextRequest) {
  const auth = getAuthFromHeaders(req);
  if (!auth) return jsonError("Unauthorized", 401);

  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return jsonError("entityType and entityId query params are required");
    }

    await prisma.userFavorite.delete({
      where: {
        userId_entityType_entityId: {
          userId: auth.userId,
          entityType,
          entityId,
        },
      },
    });

    return jsonOk({ success: true, message: "Favorite removed" });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      return jsonError("Favorite not found", 404);
    }
    console.error("DELETE /api/favorites error:", err);
    return jsonError("Failed to remove favorite", 500);
  }
}

// ─── PATCH: Reorder favorites (batch update positions) ───────
export async function PATCH(req: NextRequest) {
  const auth = getAuthFromHeaders(req);
  if (!auth) return jsonError("Unauthorized", 401);

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError("Invalid JSON body");
    }

    const { items } = body as { items?: { id: string; position: number }[] };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return jsonError("items array is required with {id, position} objects");
    }

    // Validate each item has a string id and numeric position
    for (const item of items) {
      if (!item.id || typeof item.id !== "string") {
        return jsonError("Each item must have a valid string id");
      }
      if (typeof item.position !== "number" || item.position < 0 || !Number.isInteger(item.position)) {
        return jsonError("Each item must have a non-negative integer position");
      }
    }

    // Batch update positions in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.userFavorite.update({
          where: { id: item.id, userId: auth!.userId },
          data: { position: item.position },
        })
      )
    );

    return jsonOk({ success: true, message: "Favorites reordered" });
  } catch (err) {
    console.error("PATCH /api/favorites error:", err);
    return jsonError("Failed to reorder favorites", 500);
  }
}
