import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED_MIME = new Set([
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

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const entry = form.get("file");

    if (!entry || typeof entry === "string") {
      return NextResponse.json({ ok: false, error: "Missing file (field name must be 'file')." }, { status: 400 });
    }

    const file = entry as File;

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Invalid file type. Use JPG/PNG/WEBP/GIF." },
        { status: 415 }
      );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 3MB)." }, { status: 413 });
    }

    const ext = extFromMime(file.type) || path.extname(file.name) || ".jpg";
    const filename = `${randomUUID()}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });

    const fullPath = path.join(uploadDir, filename);
    await writeFile(fullPath, Buffer.from(bytes));

    const url = `/uploads/avatars/${filename}`;
    return NextResponse.json({ ok: true, url, filename });
  } catch (err: unknown) {
    console.error("Upload failed:", err);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
