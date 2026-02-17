import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { storeImage, UploadError } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB
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
    const { url, filename } = await storeImage({ file, folder: "avatars", maxBytes: MAX_BYTES });
    return NextResponse.json({ ok: true, url, filename });
  } catch (err: unknown) {
    if (err instanceof UploadError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("Upload failed:", err);
    return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
  }
}
