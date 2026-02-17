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
    const q = String(url.searchParams.get("q") || "").trim();

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
    const skip = (page - 1) * pageSize;

    const where = q
      ? { category_name: { contains: q, mode: "insensitive" as const } }
      : {};

    const [total, rows] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        orderBy: { category_name: "asc" },
        skip,
        take: pageSize,
        select: {
          category_id: true,
          category_name: true,
          _count: {
            select: {
              lost_items: true,
              found_items: true,
            },
          },
        },
      }),
    ]);

    const items = rows.map((c) => ({
      category_id: c.category_id,
      category_name: c.category_name,
      lostCount: c._count.lost_items,
      foundCount: c._count.found_items,
      totalCount: c._count.lost_items + c._count.found_items,
    }));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json(
      { ok: true, page, pageSize, total, totalPages, items },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
