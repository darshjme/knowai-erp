import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHandler, jsonError } from "@/lib/create-handler";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

// NOTE: Any authenticated user can preview files. File-level ACL deferred.
const _GET = createHandler({}, async (req: NextRequest) => {
  const segments = req.nextUrl.pathname.split("/");
  const id = segments[segments.length - 1];

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) {
    return jsonError("File not found", 404);
  }

  if (!file.filePath) {
    return jsonError("File has no stored path", 404);
  }

  const ext = path.extname(file.name).toLowerCase();

  // For Office files, redirect to Google Docs viewer
  const officeExts = [".xlsx", ".xls", ".docx", ".doc", ".pptx", ".ppt", ".key"];
  if (officeExts.includes(ext)) {
    // Since files are local, we can't use Google/Microsoft viewer directly
    // Return a JSON response with viewer options
    const serveUrl = file.url || `/api/files/serve/${path.basename(file.filePath)}`;
    return NextResponse.json({
      type: "office",
      name: file.name,
      downloadUrl: serveUrl,
      message: "Office files must be downloaded to view. Use Google Docs or Microsoft Office to open.",
    });
  }

  // For PDF and images, serve directly
  const fullPath = path.join(process.cwd(), file.filePath);

  if (!existsSync(fullPath)) {
    return jsonError("File not found on disk", 404);
  }

  const fileBuffer = await readFile(fullPath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${file.name}"`,
      "Content-Length": fileBuffer.length.toString(),
      "Cache-Control": "private, max-age=3600",
    },
  });
});

export async function GET(req: NextRequest) { return _GET(req); }
