#!/usr/bin/env npx tsx
/**
 * sync-figma-tokens.ts
 *
 * Syncs KnowAI ERP design tokens to Figma Variables via the Figma REST API.
 * Reads tokens from design-tokens.json and pushes them as Figma variables
 * organized into collections: Colors, Spacing, Typography, Border Radius.
 *
 * Usage:
 *   npx tsx scripts/sync-figma-tokens.ts
 *   npx tsx scripts/sync-figma-tokens.ts --dry-run
 *
 * Required env vars:
 *   FIGMA_ACCESS_TOKEN  — Figma personal access token (with variables:write scope)
 *   FIGMA_FILE_KEY      — The Figma file key (from the URL: figma.com/design/<FILE_KEY>/...)
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FIGMA_API_BASE = "https://api.figma.com/v1";
const DRY_RUN = process.argv.includes("--dry-run");

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`ERROR: Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return val;
}

// ---------------------------------------------------------------------------
// Token loading
// ---------------------------------------------------------------------------

interface TokenEntry {
  value: string;
  type: string;
}

interface TypographyEntry {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
}

interface DesignTokens {
  "KnowAI Design Tokens": {
    color: Record<string, Record<string, TokenEntry>>;
    spacing: Record<string, TokenEntry>;
    borderRadius: Record<string, TokenEntry>;
    fontSize: Record<string, TokenEntry>;
    fontWeight: Record<string, TokenEntry>;
    lineHeight: Record<string, TokenEntry>;
    typography: Record<string, TypographyEntry>;
  };
}

function loadTokens(): DesignTokens {
  const tokensPath = resolve(__dirname, "..", "design-tokens.json");
  const raw = readFileSync(tokensPath, "utf-8");
  return JSON.parse(raw) as DesignTokens;
}

// ---------------------------------------------------------------------------
// Color parsing — hex to Figma RGBA (0-1 range)
// ---------------------------------------------------------------------------

interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function hexToFigmaColor(hex: string): FigmaColor {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16) / 255,
    g: parseInt(clean.substring(2, 4), 16) / 255,
    b: parseInt(clean.substring(4, 6), 16) / 255,
    a: 1,
  };
}

function rgbaToFigmaColor(rgba: string): FigmaColor {
  const match = rgba.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/
  );
  if (!match) {
    throw new Error(`Cannot parse color: ${rgba}`);
  }
  return {
    r: parseInt(match[1], 10) / 255,
    g: parseInt(match[2], 10) / 255,
    b: parseInt(match[3], 10) / 255,
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

function parseColor(value: string): FigmaColor {
  if (value.startsWith("#")) return hexToFigmaColor(value);
  if (value.startsWith("rgb")) return rgbaToFigmaColor(value);
  throw new Error(`Unsupported color format: ${value}`);
}

// ---------------------------------------------------------------------------
// Build variable payloads
// ---------------------------------------------------------------------------

interface VariablePayload {
  name: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING";
  value: FigmaColor | number | string;
  collection: string;
  description?: string;
}

function buildColorVariables(
  colorGroups: Record<string, Record<string, TokenEntry>>
): VariablePayload[] {
  const vars: VariablePayload[] = [];
  for (const [group, entries] of Object.entries(colorGroups)) {
    for (const [name, token] of Object.entries(entries)) {
      vars.push({
        name: `color/${group}/${name}`,
        resolvedType: "COLOR",
        value: parseColor(token.value),
        collection: "Colors",
        description: `${group}/${name} — ${token.value}`,
      });
    }
  }
  return vars;
}

function buildSpacingVariables(
  spacing: Record<string, TokenEntry>
): VariablePayload[] {
  return Object.entries(spacing).map(([name, token]) => ({
    name: `spacing/${name}`,
    resolvedType: "FLOAT" as const,
    value: parseFloat(token.value),
    collection: "Spacing",
    description: `${token.value}px`,
  }));
}

function buildBorderRadiusVariables(
  radii: Record<string, TokenEntry>
): VariablePayload[] {
  return Object.entries(radii).map(([name, token]) => ({
    name: `borderRadius/${name}`,
    resolvedType: "FLOAT" as const,
    value: parseFloat(token.value),
    collection: "Border Radius",
    description: `${token.value}px`,
  }));
}

function buildFontSizeVariables(
  sizes: Record<string, TokenEntry>
): VariablePayload[] {
  return Object.entries(sizes).map(([name, token]) => ({
    name: `typography/fontSize/${name}`,
    resolvedType: "FLOAT" as const,
    value: parseFloat(token.value),
    collection: "Typography",
    description: `${token.value}px`,
  }));
}

function buildFontWeightVariables(
  weights: Record<string, TokenEntry>
): VariablePayload[] {
  return Object.entries(weights).map(([name, token]) => ({
    name: `typography/fontWeight/${name}`,
    resolvedType: "FLOAT" as const,
    value: parseFloat(token.value),
    collection: "Typography",
    description: `Weight ${token.value}`,
  }));
}

function buildLineHeightVariables(
  lineHeights: Record<string, TokenEntry>
): VariablePayload[] {
  return Object.entries(lineHeights).map(([name, token]) => ({
    name: `typography/lineHeight/${name}`,
    resolvedType: "FLOAT" as const,
    value: parseFloat(token.value),
    collection: "Typography",
    description: `Line height ${token.value}`,
  }));
}

// ---------------------------------------------------------------------------
// Figma API helpers
// ---------------------------------------------------------------------------

async function figmaFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<unknown> {
  const url = `${FIGMA_API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "X-Figma-Token": token,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Figma API ${res.status}: ${text}`);
  }
  return res.json();
}

interface FigmaVariableCollection {
  id: string;
  name: string;
  modes: { modeId: string; name: string }[];
}

interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: string;
  variableCollectionId: string;
}

interface LocalVariablesResponse {
  meta: {
    variableCollections: Record<string, FigmaVariableCollection>;
    variables: Record<string, FigmaVariable>;
  };
}

async function getExistingVariables(
  fileKey: string,
  token: string
): Promise<LocalVariablesResponse> {
  return (await figmaFetch(
    `/files/${fileKey}/variables/local`,
    token
  )) as LocalVariablesResponse;
}

interface PostVariablesAction {
  action: "CREATE" | "UPDATE" | "DELETE";
  id?: string;
  name?: string;
  resolvedType?: string;
  variableCollectionId?: string;
  description?: string;
}

interface PostVariablesModeValue {
  variableId: string;
  modeId: string;
  value: FigmaColor | number | string;
}

interface PostVariablesCollectionAction {
  action: "CREATE" | "UPDATE";
  id?: string;
  name: string;
  initialModeId?: string;
}

interface PostVariablesBody {
  variableCollections?: PostVariablesCollectionAction[];
  variables?: PostVariablesAction[];
  variableModeValues?: PostVariablesModeValue[];
}

async function postVariables(
  fileKey: string,
  token: string,
  body: PostVariablesBody
): Promise<unknown> {
  return figmaFetch(`/files/${fileKey}/variables`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Sync logic
// ---------------------------------------------------------------------------

async function syncToFigma(variables: VariablePayload[]): Promise<void> {
  const token = requireEnv("FIGMA_ACCESS_TOKEN");
  const fileKey = requireEnv("FIGMA_FILE_KEY");

  console.log(`\nFetching existing variables from Figma file: ${fileKey}...`);
  const existing = await getExistingVariables(fileKey, token);

  // Build lookup maps
  const existingCollections = Object.values(
    existing.meta.variableCollections || {}
  );
  const existingVars = Object.values(existing.meta.variables || {});

  const collectionByName = new Map<string, FigmaVariableCollection>();
  for (const c of existingCollections) {
    collectionByName.set(c.name, c);
  }

  const varByName = new Map<string, FigmaVariable>();
  for (const v of existingVars) {
    varByName.set(v.name, v);
  }

  // Determine which collections need to be created
  const neededCollections = new Set(variables.map((v) => v.collection));
  const collectionsToCreate: PostVariablesCollectionAction[] = [];
  const tempCollectionIds = new Map<string, string>();

  for (const collName of neededCollections) {
    if (!collectionByName.has(collName)) {
      const tempId = `temp_coll_${collName.replace(/\s/g, "_")}`;
      collectionsToCreate.push({
        action: "CREATE",
        name: collName,
        id: tempId,
      });
      tempCollectionIds.set(collName, tempId);
      console.log(`  [+] Will create collection: ${collName}`);
    } else {
      console.log(`  [=] Collection exists: ${collName}`);
    }
  }

  // Build variable actions
  const variableActions: PostVariablesAction[] = [];
  const modeValues: PostVariablesModeValue[] = [];
  const tempVarIds = new Map<string, string>();

  for (const v of variables) {
    const existingVar = varByName.get(v.name);
    const collectionId =
      collectionByName.get(v.collection)?.id ||
      tempCollectionIds.get(v.collection);

    if (!collectionId) {
      console.error(`  [!] No collection ID for ${v.collection}, skipping ${v.name}`);
      continue;
    }

    if (existingVar) {
      // Update existing variable
      variableActions.push({
        action: "UPDATE",
        id: existingVar.id,
        name: v.name,
        description: v.description,
      });

      const coll =
        collectionByName.get(v.collection) ||
        existingCollections.find((c) => c.id === existingVar.variableCollectionId);
      const modeId = coll?.modes?.[0]?.modeId;
      if (modeId) {
        modeValues.push({
          variableId: existingVar.id,
          modeId,
          value: v.value,
        });
      }
    } else {
      // Create new variable
      const tempId = `temp_var_${v.name.replace(/[/\s]/g, "_")}`;
      tempVarIds.set(v.name, tempId);

      variableActions.push({
        action: "CREATE",
        id: tempId,
        name: v.name,
        resolvedType: v.resolvedType,
        variableCollectionId: collectionId,
        description: v.description,
      });

      // For new collections we need to reference the temp mode ID pattern
      // For existing collections, use the first mode
      const existingColl = collectionByName.get(v.collection);
      if (existingColl) {
        modeValues.push({
          variableId: tempId,
          modeId: existingColl.modes[0].modeId,
          value: v.value,
        });
      }
      // For new collections, Figma auto-creates a default mode with the collection
      // and we won't know the modeId until after creation — so we skip setting values
      // for brand-new collections in the same request. A second pass handles this.
    }
  }

  const body: PostVariablesBody = {};
  if (collectionsToCreate.length > 0) {
    body.variableCollections = collectionsToCreate;
  }
  if (variableActions.length > 0) {
    body.variables = variableActions;
  }
  if (modeValues.length > 0) {
    body.variableModeValues = modeValues;
  }

  console.log(`\nSync summary:`);
  console.log(`  Collections to create: ${collectionsToCreate.length}`);
  console.log(`  Variables to create/update: ${variableActions.length}`);
  console.log(`  Mode values to set: ${modeValues.length}`);

  console.log(`\nPOSTing variables to Figma...`);
  const result = await postVariables(fileKey, token, body);
  console.log(`Figma API response:`, JSON.stringify(result, null, 2));

  // Second pass: if we created new collections, fetch again and set values
  if (collectionsToCreate.length > 0) {
    console.log(`\nSecond pass: setting values for newly created collections...`);
    const updated = await getExistingVariables(fileKey, token);
    const updatedCollections = Object.values(
      updated.meta.variableCollections || {}
    );
    const updatedVars = Object.values(updated.meta.variables || {});

    const secondModeValues: PostVariablesModeValue[] = [];

    for (const v of variables) {
      const coll = updatedCollections.find((c) => c.name === v.collection);
      const figmaVar = updatedVars.find((fv) => fv.name === v.name);

      if (coll && figmaVar) {
        const modeId = coll.modes[0]?.modeId;
        if (modeId) {
          secondModeValues.push({
            variableId: figmaVar.id,
            modeId,
            value: v.value,
          });
        }
      }
    }

    if (secondModeValues.length > 0) {
      const result2 = await postVariables(fileKey, token, {
        variableModeValues: secondModeValues,
      });
      console.log(`Second pass response:`, JSON.stringify(result2, null, 2));
    }
  }

  console.log(`\nSync complete.`);
}

// ---------------------------------------------------------------------------
// Dry-run printer
// ---------------------------------------------------------------------------

function printDryRun(variables: VariablePayload[]): void {
  const grouped = new Map<string, VariablePayload[]>();
  for (const v of variables) {
    const list = grouped.get(v.collection) || [];
    list.push(v);
    grouped.set(v.collection, list);
  }

  console.log(`\n=== DRY RUN — Tokens that would be synced to Figma ===\n`);

  for (const [collection, vars] of grouped) {
    console.log(`Collection: ${collection} (${vars.length} variables)`);
    console.log("─".repeat(60));

    for (const v of vars) {
      const valueStr =
        typeof v.value === "object"
          ? `rgba(${(v.value.r * 255).toFixed(0)}, ${(v.value.g * 255).toFixed(0)}, ${(v.value.b * 255).toFixed(0)}, ${v.value.a})`
          : String(v.value);
      console.log(`  ${v.resolvedType.padEnd(6)} ${v.name.padEnd(40)} ${valueStr}`);
    }
    console.log("");
  }

  console.log(`Total: ${variables.length} variables across ${grouped.size} collections`);
  console.log(`\nTo actually sync, run without --dry-run flag.\n`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("KnowAI ERP — Figma Design Tokens Sync");
  console.log("======================================\n");

  const tokens = loadTokens();
  const root = tokens["KnowAI Design Tokens"];

  // Build all variable payloads
  const allVariables: VariablePayload[] = [
    ...buildColorVariables(root.color),
    ...buildSpacingVariables(root.spacing),
    ...buildBorderRadiusVariables(root.borderRadius),
    ...buildFontSizeVariables(root.fontSize),
    ...buildFontWeightVariables(root.fontWeight),
    ...buildLineHeightVariables(root.lineHeight),
  ];

  console.log(`Loaded ${allVariables.length} variables from design-tokens.json`);

  if (DRY_RUN) {
    printDryRun(allVariables);
    return;
  }

  await syncToFigma(allVariables);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
