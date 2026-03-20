import { NextRequest, NextResponse } from "next/server";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { webhooksDB } from "@/lib/webhooks-store";

type RouteContext = { params: Promise<{ id: string }> };

// Extract webhook ID from URL pathname: /api/webhooks/<id>
function extractId(req: NextRequest): string {
  const segments = new URL(req.url).pathname.split("/");
  return segments[segments.length - 1];
}

// GET /api/webhooks/:id - Get single webhook
const getHandler = createHandler(
  { roles: ["ADMIN"] },
  async (req: NextRequest) => {
    const id = extractId(req);
    const webhook = webhooksDB.get(id);

    if (!webhook) {
      return jsonError("Webhook not found", 404);
    }

    return jsonOk({ success: true, data: webhook });
  }
);

export async function GET(request: NextRequest, _ctx: RouteContext): Promise<NextResponse> {
  return getHandler(request);
}

// PUT /api/webhooks/:id - Update webhook
const putHandler = createHandler(
  { roles: ["ADMIN"], rateLimit: "write" },
  async (req: NextRequest) => {
    const id = extractId(req);
    const body = await req.json();
    const existing = webhooksDB.get(id);

    if (!existing) {
      return jsonError("Webhook not found", 404);
    }

    // Delete old and recreate with merged data (preserving id and secret)
    webhooksDB.delete(id);
    const updated = webhooksDB.create({
      url: body.url ?? existing.url,
      events: body.events ?? existing.events,
      active: body.active ?? existing.active,
      secret: existing.secret,
    });

    return jsonOk({ success: true, data: updated });
  }
);

export async function PUT(request: NextRequest, _ctx: RouteContext): Promise<NextResponse> {
  return putHandler(request);
}

// DELETE /api/webhooks/:id - Delete webhook
const deleteHandler = createHandler(
  { roles: ["ADMIN"], rateLimit: "write" },
  async (req: NextRequest) => {
    const id = extractId(req);
    const deleted = webhooksDB.delete(id);

    if (!deleted) {
      return jsonError("Webhook not found", 404);
    }

    return jsonOk({ success: true, message: "Webhook deleted successfully" });
  }
);

export async function DELETE(request: NextRequest, _ctx: RouteContext): Promise<NextResponse> {
  return deleteHandler(request);
}
