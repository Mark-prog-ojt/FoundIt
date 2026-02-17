import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const [categories, locations] = await Promise.all([
      prisma.category.findMany({
        orderBy: { category_id: "asc" },
        select: { category_id: true, category_name: true },
      }),
      prisma.location.findMany({
        orderBy: { location_id: "asc" },
        select: { location_id: true, location_name: true },
      }),
    ]);

    return NextResponse.json({ ok: true, categories, locations }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
