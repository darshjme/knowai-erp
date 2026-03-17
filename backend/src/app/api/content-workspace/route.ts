import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

const SENIOR_ROLES = ["CEO", "CTO", "CFO", "BRAND_FACE", "PRODUCT_OWNER", "HR", "ADMIN"];

// GET: List collections and assets
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const collectionId = searchParams.get("collectionId");
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    // Single collection with assets
    if (collectionId) {
      const collection = await prisma.contentCollection.findUnique({
        where: { id: collectionId },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true, role: true } },
          assets: {
            include: {
              uploadedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { assets: true } },
        },
      });
      if (!collection) return jsonError("Collection not found", 404);
      return jsonOk({ success: true, data: collection });
    }

    // List all collections
    const where: Record<string, unknown> = { workspaceId: user.workspaceId };
    if (type) where.type = type;

    const collections = await prisma.contentCollection.findMany({
      where,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { assets: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // If search query, also search assets
    let assets: unknown[] = [];
    if (search) {
      assets = await prisma.contentAsset.findMany({
        where: {
          workspaceId: user.workspaceId,
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { tags: { hasSome: [search.toLowerCase()] } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        },
        include: {
          collection: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }

    return jsonOk({ success: true, data: { collections, assets } });
  } catch (error) {
    console.error("Content Workspace GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// POST: Create collection or add asset
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { action } = body;

    if (action === "createCollection") {
      // Only senior roles can create collections
      if (!SENIOR_ROLES.includes(user.role) && !user.role.startsWith("SR_")) {
        return jsonError("Only senior roles can create collections", 403);
      }

      const { name, description, type, icon, color, coverUrl } = body;
      if (!name || !type) return jsonError("name and type are required", 400);

      const collection = await prisma.contentCollection.create({
        data: {
          name, description: description || null, type,
          icon: icon || null, color: color || "#3b82f6",
          coverUrl: coverUrl || null,
          createdById: user.id, workspaceId: user.workspaceId,
        },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          _count: { select: { assets: true } },
        },
      });
      return jsonOk({ success: true, data: collection }, 201);
    }

    if (action === "addAsset") {
      const { name, description, fileUrl, thumbnailUrl, fileType, mimeType, fileSize, embedUrl, tags, collectionId } = body;
      if (!name || !collectionId) return jsonError("name and collectionId are required", 400);
      if (!fileUrl && !embedUrl) return jsonError("fileUrl or embedUrl is required", 400);

      const collection = await prisma.contentCollection.findUnique({ where: { id: collectionId } });
      if (!collection) return jsonError("Collection not found", 404);

      const asset = await prisma.contentAsset.create({
        data: {
          name, description: description || null,
          fileUrl: fileUrl || embedUrl || "",
          thumbnailUrl: thumbnailUrl || null,
          fileType: fileType || "OTHER",
          mimeType: mimeType || null,
          fileSize: fileSize ? parseInt(fileSize, 10) : null,
          embedUrl: embedUrl || null,
          tags: Array.isArray(tags) ? tags : [],
          collectionId, uploadedById: user.id,
          workspaceId: user.workspaceId,
        },
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          collection: { select: { id: true, name: true } },
        },
      });
      return jsonOk({ success: true, data: asset }, 201);
    }

    return jsonError("Invalid action. Supported: createCollection, addAsset", 400);
  } catch (error) {
    console.error("Content Workspace POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// PATCH: Update collection or asset
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { id, type: entityType } = body;
    if (!id) return jsonError("id is required", 400);

    if (entityType === "asset") {
      const asset = await prisma.contentAsset.findUnique({ where: { id } });
      if (!asset) return jsonError("Asset not found", 404);

      const data: Record<string, unknown> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.description !== undefined) data.description = body.description;
      if (body.tags !== undefined) data.tags = body.tags;
      if (body.embedUrl !== undefined) data.embedUrl = body.embedUrl;

      const updated = await prisma.contentAsset.update({ where: { id }, data });
      return jsonOk({ success: true, data: updated });
    }

    // Default: update collection
    const collection = await prisma.contentCollection.findUnique({ where: { id } });
    if (!collection) return jsonError("Collection not found", 404);

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.color !== undefined) data.color = body.color;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.coverUrl !== undefined) data.coverUrl = body.coverUrl;

    const updated = await prisma.contentCollection.update({ where: { id }, data });
    return jsonOk({ success: true, data: updated });
  } catch (error) {
    console.error("Content Workspace PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

// DELETE: Delete collection or asset
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const entityType = searchParams.get("type");
    if (!id) return jsonError("id is required", 400);

    if (entityType === "asset") {
      const asset = await prisma.contentAsset.findUnique({ where: { id } });
      if (!asset) return jsonError("Asset not found", 404);
      if (asset.uploadedById !== user.id && !SENIOR_ROLES.includes(user.role)) {
        return jsonError("Only uploader or senior roles can delete", 403);
      }
      await prisma.contentAsset.delete({ where: { id } });
      return jsonOk({ success: true, message: "Asset deleted" });
    }

    const collection = await prisma.contentCollection.findUnique({ where: { id } });
    if (!collection) return jsonError("Collection not found", 404);
    if (collection.createdById !== user.id && !SENIOR_ROLES.includes(user.role)) {
      return jsonError("Only creator or senior roles can delete collections", 403);
    }
    await prisma.contentCollection.delete({ where: { id } });
    return jsonOk({ success: true, message: "Collection and all assets deleted" });
  } catch (error) {
    console.error("Content Workspace DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
