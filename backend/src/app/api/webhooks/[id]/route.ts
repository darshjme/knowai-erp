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
  const webhook = webhooksDB.find((w) => w.id === id);

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
    const index = webhooksDB.findIndex((w) => w.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Webhook not found" },
        { status: 404 }
      );
    }

    webhooksDB[index] = {
      ...webhooksDB[index],
      ...body,
      id: id, // Preserve ID
      secret: webhooksDB[index].secret, // Preserve secret
    };

    return NextResponse.json({
      success: true,
      data: webhooksDB[index],
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
  const index = webhooksDB.findIndex((w) => w.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: "Webhook not found" },
      { status: 404 }
    );
  }

  webhooksDB.splice(index, 1);

  return NextResponse.json({
    success: true,
    message: "Webhook deleted successfully",
  });
}
