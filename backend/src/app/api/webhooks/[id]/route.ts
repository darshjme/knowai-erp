import { NextRequest, NextResponse } from "next/server";
import { getAuthFromHeaders, jsonError } from "@/lib/api-utils";
import { webhooksDB } from "@/lib/webhooks-store";

// GET /api/webhooks/:id - Get single webhook
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromHeaders(request);
  if (!auth) return jsonError("Unauthorized", 401);
  if (auth.role !== "ADMIN") return jsonError("Forbidden: Admin access required", 403);

  const { id } = await params;
  const webhook = webhooksDB.get(id);

  if (!webhook) {
    return NextResponse.json(
      { success: false, error: "Webhook not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: webhook,
  });
}

// PUT /api/webhooks/:id - Update webhook
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromHeaders(request);
  if (!auth) return jsonError("Unauthorized", 401);
  if (auth.role !== "ADMIN") return jsonError("Forbidden: Admin access required", 403);

  try {
    const { id } = await params;
    const body = await request.json();
    const existing = webhooksDB.get(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Webhook not found" },
        { status: 404 }
      );
    }

    // Delete old and recreate with merged data (preserving id and secret)
    webhooksDB.delete(id);
    const updated = webhooksDB.create({
      url: body.url ?? existing.url,
      events: body.events ?? existing.events,
      active: body.active ?? existing.active,
      secret: existing.secret,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}

// DELETE /api/webhooks/:id - Delete webhook
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromHeaders(request);
  if (!auth) return jsonError("Unauthorized", 401);
  if (auth.role !== "ADMIN") return jsonError("Forbidden: Admin access required", 403);

  const { id } = await params;
  const deleted = webhooksDB.delete(id);

  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "Webhook not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Webhook deleted successfully",
  });
}
