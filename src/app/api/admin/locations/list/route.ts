import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String((session as any).role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
    const q = String(url.searchParams.get("q") || "").trim();

    const where: any = {};
    if (q) {
      where.OR = [
        { location_name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.location.count({ where }),
      prisma.location.findMany({
        where,
        orderBy: { location_name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          location_id: true,
          location_name: true,
          description: true,
          _count: { select: { lost_items: true, found_items: true } },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      ok: true,
      page,
      pageSize,
      total,
      totalPages,
      items: rows.map((r) => ({
        location_id: r.location_id,
        location_name: r.location_name,
        description: r.description,
        lostCount: r._count.lost_items,
        foundCount: r._count.found_items,
        totalCount: r._count.lost_items + r._count.found_items,
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
