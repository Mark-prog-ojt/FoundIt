import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String((session as any).role ?? (session as any).role_name ?? "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
    const q = String(url.searchParams.get("q") || "").trim();

    const where = q
      ? { role_name: { contains: q, mode: "insensitive" as const } }
      : {};

    const total = await prisma.role.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const items = await prisma.role.findMany({
      where,
      orderBy: { role_id: "asc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
      select: {
        role_id: true,
        role_name: true,
        _count: { select: { users: true } },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        page: safePage,
        pageSize,
        total,
        totalPages,
        items: items.map((r) => ({
          role_id: r.role_id,
          role_name: r.role_name,
          usersCount: r._count.users,
        })),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
