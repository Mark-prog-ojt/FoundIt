import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const includeCancelled =
      url.searchParams.get("includeCancelled") === "1" ||
      url.searchParams.get("includeCancelled") === "true";

    const where: any = { user_id: session.userId };
    if (!includeCancelled) {
      where.status = { not: "CANCELLED" };
    }

    const reports = await prisma.lostItem.findMany({
      where,
      orderBy: { date_created: "desc" },
      take: 25,
      select: {
        lost_id: true,
        item_name: true,
        status: true,
        date_lost: true,
        date_created: true,
        category: { select: { category_name: true } },
        location: { select: { location_name: true } },
      },
    });

    return NextResponse.json({ ok: true, reports }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
