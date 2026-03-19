import { NextRequest, NextResponse } from "next/server";
import { getAuthFromHeaders, jsonError } from "@/lib/api-utils";
import { webhooksDB } from "@/lib/webhooks-store";

// GET /api/webhooks - List all webhooks
export async function GET(request: NextRequest) {
  const auth = getAuthFromHeaders(request);
  if (!auth) return jsonError("Unauthorized", 401);
  if (auth.role !== "ADMIN") return jsonError("Forbidden: Admin access required", 403);

  return NextResponse.json({
    success: true,
    data: webhooksDB.getAll(),
  });
}

// POST /api/webhooks - Create new webhook
export async function POST(request: NextRequest) {
  const auth = getAuthFromHeaders(request);
  if (!auth) return jsonError("Unauthorized", 401);
  if (auth.role !== "ADMIN") return jsonError("Forbidden: Admin access required", 403);

  try {
    const body = await request.json();
    const { url, events, active } = body;

    if (!url || !events || events.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const newWebhook = webhooksDB.create({
      url,
      events,
      active: active ?? true,
      secret: "whsec_" + Math.random().toString(36).substring(2, 15),
    });

    return NextResponse.json({
      success: true,
      data: newWebhook,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
