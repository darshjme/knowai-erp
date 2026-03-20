/**
 * Storage abstraction — S3-compatible (Hetzner) or local filesystem fallback.
 *
 * When S3_ENDPOINT is set, files go to S3-compatible object storage.
 * Otherwise, files are saved to the local `uploads/` directory (dev mode).
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// ─── S3 client (lazy singleton) ──────────────────────────────────────────────

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT!,
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true, // Required for most S3-compatible providers (Hetzner, MinIO, etc.)
    });
  }
  return _s3;
}

function isS3Configured(): boolean {
  return !!(
    process.env.S3_ENDPOINT &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY
  );
}

function getBucket(): string {
  return process.env.S3_BUCKET!;
}

// ─── Upload ──────────────────────────────────────────────────────────────────

/**
 * Upload a file and return its public URL.
 *
 * @param key         Object key / path, e.g. "resumes/user-123-1700000000.pdf"
 * @param buffer      File contents
 * @param contentType MIME type, e.g. "application/pdf"
 * @returns           Public URL string
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (isS3Configured()) {
    const s3 = getS3();
    await s3.send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    // Build public URL: <endpoint>/<bucket>/<key>
    const endpoint = process.env.S3_ENDPOINT!.replace(/\/+$/, "");
    return `${endpoint}/${getBucket()}/${key}`;
  }

  // ── Local fallback (dev) ──
  const uploadsDir = path.join(process.cwd(), "uploads");
  const fullPath = path.join(uploadsDir, key);
  if (!fullPath.startsWith(uploadsDir)) throw new Error("Invalid file path");
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buffer);

  const fileName = path.basename(key);
  return `/api/files/serve/${fileName}`;
}

// ─── Signed URL (for private files) ─────────────────────────────────────────

/**
 * Generate a time-limited signed URL for private file access (e.g. gov IDs).
 *
 * @param key       Object key
 * @param expiresIn Seconds until expiry (default 3600 = 1 hour)
 * @returns         Signed URL string
 */
export async function getSignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  if (isS3Configured()) {
    const s3 = getS3();
    const command = new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    });
    return awsGetSignedUrl(s3, command, { expiresIn });
  }

  // Local fallback — just return the serve path
  const fileName = path.basename(key);
  return `/api/files/serve/${fileName}`;
}

// ─── Delete ──────────────────────────────────────────────────────────────────

/**
 * Delete a file from storage.
 *
 * @param key Object key to delete
 */
export async function deleteFile(key: string): Promise<void> {
  if (isS3Configured()) {
    const s3 = getS3();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: key,
      })
    );
    return;
  }

  // Local fallback
  const fullPath = path.join(process.cwd(), "uploads", key);
  try {
    await unlink(fullPath);
  } catch {
    // File may not exist — ignore
  }
}
