import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonOk, jsonError, getAuthUser } from "@/lib/api-utils";

const FULL_ACCESS_ROLES = ["CEO", "CTO", "ADMIN", "CFO", "PRODUCT_OWNER"];
const CREATE_ROLES = ["CEO", "CTO", "ADMIN", "CFO", "PRODUCT_OWNER", "HR"];

// ── GET ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Non-full-access users only see subscriptions in their workspace
    if (!FULL_ACCESS_ROLES.includes(user.role)) {
      where.OR = [
        { managedById: user.id },
        { workspaceId: user.workspaceId },
      ];
    }

    if (category && category !== "All") where.category = category;
    if (status && status !== "All") where.status = status;
    if (search) {
      const searchFilter = [
        { name: { contains: search, mode: "insensitive" } },
        { provider: { contains: search, mode: "insensitive" } },
        { plan: { contains: search, mode: "insensitive" } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchFilter }];
        delete where.OR;
      } else {
        where.OR = searchFilter;
      }
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: { renewalDate: "asc" },
    });

    // Cost aggregation
    const active = subscriptions.filter((s) => s.status === "ACTIVE" || s.status === "TRIAL");
    const totalMonthly = active.reduce((sum, s) => {
      if (s.billingCycle === "YEARLY") return sum + s.cost / 12;
      if (s.billingCycle === "QUARTERLY") return sum + s.cost / 3;
      return sum + s.cost;
    }, 0);
    const totalYearly = totalMonthly * 12;

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSoon = subscriptions.filter(
      (s) => s.renewalDate && new Date(s.renewalDate) <= thirtyDays && new Date(s.renewalDate) >= now && s.status === "ACTIVE"
    ).length;

    return jsonOk({
      success: true,
      data: {
        subscriptions,
        totals: {
          monthly: Math.round(totalMonthly * 100) / 100,
          yearly: Math.round(totalYearly * 100) / 100,
          activeCount: active.length,
          expiringSoon,
        },
      },
    });
  } catch (error) {
    console.error("Subscriptions GET error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ── POST ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    if (!CREATE_ROLES.includes(user.role)) {
      return jsonError("Insufficient permissions to create subscriptions", 403);
    }

    const body = await req.json();
    const {
      name, provider, plan, cost, billingCycle, currency,
      startDate, renewalDate, expiryDate, autoRenew, status,
      category, loginUrl, credentialId, notes,
    } = body;

    if (!name || cost === undefined || cost === null) {
      return jsonError("name and cost are required", 400);
    }
    if (!startDate) {
      return jsonError("startDate is required", 400);
    }

    const subscription = await prisma.subscription.create({
      data: {
        name,
        provider: provider || null,
        plan: plan || null,
        cost: parseFloat(cost),
        billingCycle: billingCycle || "MONTHLY",
        currency: currency || "INR",
        startDate: new Date(startDate),
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        autoRenew: autoRenew !== undefined ? autoRenew : true,
        status: status || "ACTIVE",
        category: category || "Other",
        loginUrl: loginUrl || null,
        credentialId: credentialId || null,
        notes: notes || null,
        managedById: user.id,
        workspaceId: user.workspaceId || null,
      },
    });

    return jsonOk({ success: true, data: subscription }, 201);
  } catch (error) {
    console.error("Subscriptions POST error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ── PATCH ────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return jsonError("Subscription id is required", 400);

    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) return jsonError("Subscription not found", 404);

    if (existing.managedById !== user.id && !FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Only subscription manager or C-level can update", 403);
    }

    const safeUpdates: Record<string, unknown> = {};
    const fields = ["name", "provider", "plan", "billingCycle", "currency", "status", "category", "loginUrl", "credentialId", "notes", "autoRenew"];
    for (const f of fields) {
      if (updates[f] !== undefined) safeUpdates[f] = updates[f];
    }
    if (updates.cost !== undefined) safeUpdates.cost = parseFloat(updates.cost);
    if (updates.startDate !== undefined) safeUpdates.startDate = new Date(updates.startDate);
    if (updates.renewalDate !== undefined) safeUpdates.renewalDate = updates.renewalDate ? new Date(updates.renewalDate) : null;
    if (updates.expiryDate !== undefined) safeUpdates.expiryDate = updates.expiryDate ? new Date(updates.expiryDate) : null;

    const subscription = await prisma.subscription.update({
      where: { id },
      data: safeUpdates,
    });

    return jsonOk({ success: true, data: subscription });
  } catch (error) {
    console.error("Subscriptions PATCH error:", error);
    return jsonError("Internal server error", 500);
  }
}

// ── DELETE ───────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return jsonError("Subscription id is required", 400);

    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) return jsonError("Subscription not found", 404);

    if (existing.managedById !== user.id && !FULL_ACCESS_ROLES.includes(user.role)) {
      return jsonError("Only subscription manager or C-level can delete", 403);
    }

    await prisma.subscription.delete({ where: { id } });

    return jsonOk({ success: true, message: "Subscription deleted successfully" });
  } catch (error) {
    console.error("Subscriptions DELETE error:", error);
    return jsonError("Internal server error", 500);
  }
}
