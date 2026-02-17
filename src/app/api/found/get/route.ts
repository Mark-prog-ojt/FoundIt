import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const foundIdRaw = url.searchParams.get("foundId");
    const foundId = foundIdRaw ? Number(foundIdRaw) : NaN;

    if (!Number.isFinite(foundId)) {
      return NextResponse.json({ ok: false, error: "Invalid foundId." }, { status: 400 });
    }

    const item = await prisma.foundItem.findFirst({
      where: { found_id: foundId },
      select: {
        found_id: true,
        item_name: true,
        description: true,
        date_found: true,
        storage_location: true,
        image: true,
        status: true,
        category: { select: { category_name: true } },
        location: { select: { location_name: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
