import { NextRequest, NextResponse } from "next/server";
import { getAuthFromHeaders, jsonError } from "@/lib/api-utils";
import { webhooksDB } from "@/lib/webhooks-store";
import { resolve } from "dns/promises";

/**
 * Check if an IP address is private/internal.
 */
function isPrivateIp(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    // 127.0.0.0/8
    if (parts[0] === 127) return true;
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (link-local / cloud metadata)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8
    if (parts[0] === 0) return true;
  }

  // IPv6 loopback
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;

  return false;
}

/**
 * Validates a URL to prevent SSRF attacks.
 * Blocks internal/private IP ranges, non-HTTP(S) schemes, and
 * resolves hostnames to verify they don't point to internal IPs.
 */
async function isUrlSafe(urlString: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  // Only allow http and https schemes
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const hostname = parsed.hostname;

  // Block localhost variants
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return false;
  }

  // Block common cloud metadata hostnames
  if (
    hostname === "metadata.google.internal" ||
    hostname === "metadata.internal" ||
    hostname.endsWith(".internal")
  ) {
    return false;
  }

  // Check if hostname is a direct IP
  const ipParts = hostname.split(".").map(Number);
  if (ipParts.length === 4 && ipParts.every((p) => !isNaN(p))) {
    return !isPrivateIp(hostname);
  }

  // Resolve hostname to IP and check resolved addresses (prevents DNS rebinding)
  try {
    const addresses = await resolve(hostname);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) {
        return false;
      }
    }
  } catch {
    // DNS resolution failed — block the request to be safe
    return false;
  }

  return true;
}

// POST /api/webhooks/:id/test - Test webhook delivery
export async function POST(
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

  // SSRF protection: validate the webhook URL before making requests
  const safe = await isUrlSafe(webhook.url);
  if (!safe) {
    return NextResponse.json(
      {
        success: false,
        error: "Webhook URL is not allowed: internal or private addresses are blocked",
      },
      { status: 400 }
    );
  }

  try {
    const testPayload = {
      event: "webhook.test",
      webhook_id: webhook.id,
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook delivery",
      },
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhook.secret || "",
      },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
      redirect: "error", // Prevent redirect-based SSRF
    }).catch(() => null).finally(() => clearTimeout(timeout));

    const delivered = response?.ok ?? false;

    return NextResponse.json({
      success: true,
      delivered,
      status: response?.status ?? 0,
      message: delivered
        ? "Test webhook delivered successfully"
        : "Test delivery failed - webhook endpoint may be unreachable",
    });
  } catch {
    return NextResponse.json({
      success: false,
      delivered: false,
      message: "Failed to deliver test webhook",
    });
  }
}
