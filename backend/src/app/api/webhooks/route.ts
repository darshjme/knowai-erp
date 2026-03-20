import { NextRequest } from "next/server";
import crypto from "crypto";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";
import { webhooksDB } from "@/lib/webhooks-store";
import { z } from "zod";

const createWebhookSchema = z.object({
  url: z.string().url("Valid URL is required"),
  events: z.array(z.string()).min(1, "At least one event is required"),
  active: z.boolean().optional().default(true),
});

// GET /api/webhooks - List all webhooks
export const GET = createHandler(
  { roles: ["ADMIN"] },
  async (_req: NextRequest) => {
    return jsonOk({ success: true, data: webhooksDB.getAll() });
  }
);

// POST /api/webhooks - Create new webhook
export const POST = createHandler(
  { roles: ["ADMIN"], schema: createWebhookSchema, rateLimit: "write" },
  async (_req: NextRequest, { body }) => {
    const newWebhook = webhooksDB.create({
      url: body.url,
      events: body.events,
      active: body.active ?? true,
      secret: "whsec_" + crypto.randomBytes(32).toString("hex"),
    });

    return jsonOk({ success: true, data: newWebhook });
  }
);
