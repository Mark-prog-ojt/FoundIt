import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
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
  // Any logged-in user can upload a LOST image
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const entry = form.get("file");

    if (!entry || typeof entry === "string") {
      return NextResponse.json(
        { ok: false, error: "Missing file (field name must be 'file')." },
        { status: 400 }
      );
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
      return NextResponse.json({ ok: false, error: "File too large (max 5MB)." }, { status: 413 });
    }

    const ext = extFromMime(file.type) || path.extname(file.name) || ".jpg";
    const filename = `${randomUUID()}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "lost");
    await mkdir(uploadDir, { recursive: true });

    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

    const url = `/uploads/lost/${filename}`;
    return NextResponse.json({ ok: true, url, filename });
  } catch (err: unknown) {
    console.error("Upload failed:", err);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
