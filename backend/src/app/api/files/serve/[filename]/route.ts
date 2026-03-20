import { NextRequest, NextResponse } from "next/server";
import { createHandler, jsonError } from "@/lib/create-handler";
import { stat } from "fs/promises";
import { existsSync, createReadStream } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "files");

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".key": "application/x-iwork-keynote-sffkey",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".json": "application/json",
  ".js": "text/javascript",
  ".ts": "text/typescript",
  ".html": "text/html",
  ".css": "text/css",
};

// File types that should be displayed inline in browser
const INLINE_TYPES = new Set([
  ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
  ".mp4", ".mp3", ".wav", ".txt", ".csv", ".html",
]);

const _GET = createHandler({}, async (req: NextRequest) => {
  const segments = req.nextUrl.pathname.split("/");
  const filename = segments[segments.length - 1];

  if (!filename || filename.includes("..") || filename.includes("/")) {
    return jsonError("Invalid filename", 400);
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  if (!existsSync(filePath)) {
    return jsonError("File not found", 404);
  }

  const fileStat = await stat(filePath);
  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const disposition = INLINE_TYPES.has(ext) ? "inline" : "attachment";

  // Extract original filename (remove UUID prefix)
  const originalName = filename.replace(/^[a-f0-9-]+-/, "");

  // Stream file instead of loading into memory
  const stream = createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(chunk));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `${disposition}; filename="${originalName}"`,
      "Content-Length": fileStat.size.toString(),
      "Cache-Control": "private, max-age=3600",
    },
  });
});

export async function GET(req: NextRequest) { return _GET(req); }
