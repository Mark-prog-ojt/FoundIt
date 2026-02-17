import "server-only";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";

export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return "";
}

function hasCloudinaryConfig() {
  const url = process.env.CLOUDINARY_URL;
  if (url && url.trim()) return true;
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Boolean(name && key && secret);
}

function ensureCloudinary() {
  if (!hasCloudinaryConfig()) return false;
  const cfg = cloudinary.config();
  if (!cfg.cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  return true;
}

class UploadError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function uploadToCloudinary(buffer: Buffer, folder: string) {
  const ok = ensureCloudinary();
  if (!ok) {
    throw new UploadError("Cloudinary is not configured.", 500);
  }

  const baseFolder = (process.env.CLOUDINARY_FOLDER || "foundit").trim();
  const targetFolder = baseFolder ? `${baseFolder}/${folder}` : folder;

  return new Promise<{ url: string; filename: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: targetFolder, resource_type: "image" },
      (err, result) => {
        if (err || !result) {
          reject(new UploadError("Upload failed.", 500));
          return;
        }
        resolve({
          url: result.secure_url || result.url || "",
          filename: result.public_id || result.asset_id || result.original_filename || "",
        });
      }
    );
    stream.end(buffer);
  });
}

async function uploadToLocal(buffer: Buffer, fileName: string, folder: string) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);
  return { url: `/uploads/${folder}/${fileName}`, filename: fileName };
}

export async function storeImage({
  file,
  folder,
  maxBytes,
}: {
  file: File;
  folder: "found" | "lost" | "avatars";
  maxBytes: number;
}) {
  if (!ALLOWED_IMAGE_MIME.has(file.type)) {
    throw new UploadError("Invalid file type. Use JPG/PNG/WEBP/GIF.", 415);
  }

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    throw new UploadError(
      `File too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB).`,
      413
    );
  }

  const buffer = Buffer.from(bytes);
  if (ensureCloudinary()) {
    const res = await uploadToCloudinary(buffer, folder);
    if (!res.url) throw new UploadError("Upload failed.", 500);
    return res;
  }

  const ext = extFromMime(file.type) || path.extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  return uploadToLocal(buffer, filename, folder);
}

export { UploadError };
