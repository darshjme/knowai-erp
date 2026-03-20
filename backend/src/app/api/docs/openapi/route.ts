import { NextResponse } from "next/server";
import { createHandler } from "@/lib/create-handler";
import { generateOpenApiSpec } from "@/lib/openapi";

// Public endpoint — serves OpenAPI spec as JSON
export const GET = createHandler({ public: true }, async () => {
  const spec = generateOpenApiSpec();
  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
