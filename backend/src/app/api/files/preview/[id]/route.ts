import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/api-utils";
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const file = await prisma.file.findUnique({ where: { id } });
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (!file.filePath) {
      return NextResponse.json({ error: "File has no stored path" }, { status: 404 });
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
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
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
  } catch (error) {
    console.error("GET /api/files/preview error:", error);
    return NextResponse.json({ error: "Failed to preview file" }, { status: 500 });
  }
}
