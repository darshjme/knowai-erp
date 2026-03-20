import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonOk, jsonError } from "@/lib/create-handler";

// ─── Role → max dataScope mapping ────────────────────────────
// Determines the highest dataScope a role is allowed to use.
const ROLE_MAX_DATA_SCOPE: Record<string, string> = {
  CEO: "all",
  CTO: "all",
  CFO: "all",
  BRAND_FACE: "all",
  ADMIN: "all",
  HR: "department",
  ACCOUNTING: "department",
  PRODUCT_OWNER: "department",
  CONTENT_STRATEGIST: "team",
  BRAND_PARTNER: "team",
  SR_DEVELOPER: "team",
  EDITOR: "team",
  GRAPHIC_DESIGNER: "own",
  JR_DEVELOPER: "own",
  GUY: "own",
  OFFICE_BOY: "own",
};

const DATA_SCOPE_RANK: Record<string, number> = {
  own: 0,
  team: 1,
  department: 2,
  all: 3,
};

function clampDataScope(requested: string, role: string): string {
  const maxScope = ROLE_MAX_DATA_SCOPE[role] ?? "own";
  const maxRank = DATA_SCOPE_RANK[maxScope] ?? 0;
  const requestedRank = DATA_SCOPE_RANK[requested] ?? 0;
  return requestedRank <= maxRank ? requested : maxScope;
}

// All fields from the UserPreference model that clients can read/write
const ALLOWED_FIELDS = [
  // Dashboard customization
  "sidebarOrder",
  "collapsedGroups",
  "dashboardLayout",
  "dashboardWidgets",
  "pinnedPages",
  "defaultPage",
  // Theme & appearance
  "theme",
  "accentColor",
  "sidebarStyle",
  "compactMode",
  "fontSize",
  // Localization
  "language",
  "dateFormat",
  "currency",
  "timezone",
  // Notification preferences
  "emailNotifications",
  "pushNotifications",
  "weeklyDigest",
  "desktopNotifs",
  "soundEnabled",
  // Data visibility
  "dataScope",
] as const;

// Validation rules for enum-like string fields
const VALID_VALUES: Record<string, string[]> = {
  theme: ["light", "dark"],
  sidebarStyle: ["full", "collapsed", "mini"],
  fontSize: ["small", "medium", "large"],
  dataScope: ["own", "team", "department", "all"],
};

// Boolean fields that must be true/false
const BOOLEAN_FIELDS = new Set([
  "compactMode",
  "emailNotifications",
  "pushNotifications",
  "weeklyDigest",
  "desktopNotifs",
  "soundEnabled",
]);

// JSON string fields (stored as string but hold JSON data)
const JSON_STRING_FIELDS = new Set([
  "sidebarOrder",
  "collapsedGroups",
  "dashboardLayout",
  "dashboardWidgets",
  "pinnedPages",
]);

// ─── GET /api/settings/preferences ──────────────────────────
// Return current user's preferences (create default if not exists).
// Also returns the user's role and maxDataScope.
export const GET = createHandler({}, async (_req: NextRequest, { user }) => {
  let prefs = await prisma.userPreference.findUnique({
    where: { userId: user.id },
  });

  if (!prefs) {
    prefs = await prisma.userPreference.create({
      data: { userId: user.id },
    });
  }

  const maxDataScope = ROLE_MAX_DATA_SCOPE[user.role] ?? "own";

  return jsonOk({
    data: prefs,
    role: user.role,
    maxDataScope,
  });
});

// ─── POST /api/settings/preferences ─────────────────────────
// Merge partial updates into the user's preferences (upsert).
export const POST = createHandler(
  { rateLimit: "write" },
  async (req: NextRequest, { user }) => {
    const body: Record<string, unknown> = await req.json();

    // Build update payload from whitelisted fields only
    const updateData: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const field of ALLOWED_FIELDS) {
      if (!(field in body)) continue;

      const value = body[field];

      // Validate boolean fields
      if (BOOLEAN_FIELDS.has(field)) {
        if (typeof value !== "boolean") {
          errors.push(`${field} must be a boolean`);
          continue;
        }
        updateData[field] = value;
        continue;
      }

      // Validate enum-like string fields
      if (VALID_VALUES[field]) {
        if (typeof value !== "string" || !VALID_VALUES[field].includes(value)) {
          errors.push(`${field} must be one of: ${VALID_VALUES[field].join(", ")}`);
          continue;
        }
        // Clamp dataScope based on user role
        if (field === "dataScope") {
          updateData[field] = clampDataScope(value, user.role);
        } else {
          updateData[field] = value;
        }
        continue;
      }

      // Validate JSON string fields — accept objects/arrays and stringify, or accept strings
      if (JSON_STRING_FIELDS.has(field)) {
        if (value === null) {
          updateData[field] = null;
        } else if (typeof value === "string") {
          // Verify it's valid JSON
          try {
            JSON.parse(value);
            updateData[field] = value;
          } catch {
            errors.push(`${field} must be valid JSON`);
          }
        } else if (typeof value === "object") {
          updateData[field] = JSON.stringify(value);
        } else {
          errors.push(`${field} must be a JSON string or object`);
        }
        continue;
      }

      // Remaining string fields (defaultPage, accentColor, language, dateFormat, currency, timezone)
      if (value === null) {
        updateData[field] = null;
      } else if (typeof value === "string") {
        updateData[field] = value.trim();
      } else {
        errors.push(`${field} must be a string`);
      }
    }

    if (errors.length > 0) {
      return jsonError(`Validation errors: ${errors.join("; ")}`, 400);
    }

    if (Object.keys(updateData).length === 0) {
      return jsonError("No valid fields to update", 400);
    }

    const prefs = await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...updateData },
      update: updateData,
    });

    const maxDataScope = ROLE_MAX_DATA_SCOPE[user.role] ?? "own";

    return jsonOk({
      data: prefs,
      role: user.role,
      maxDataScope,
    });
  }
);

// ─── PATCH /api/settings/preferences (kept for backwards compat) ─
// Identical behaviour to POST — merges partial updates.
export const PATCH = createHandler(
  { rateLimit: "write" },
  async (req: NextRequest, { user }) => {
    // Delegate to the POST handler logic by calling it directly
    return POST(req);
  }
);
