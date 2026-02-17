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

    const where: any = {};
    if (q.length > 0) {
      where.OR = [
        { full_name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { id_number: { contains: q, mode: "insensitive" } },
        { department: { contains: q, mode: "insensitive" } },
        { role: { role_name: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { user_id: "desc" },
        skip,
        take: pageSize,
        select: {
          user_id: true,
          full_name: true,
          id_number: true,
          email: true,
          department: true,
          status: true,
          date_registered: true,
          avatar_url: true,
          role: { select: { role_name: true } },
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
      items: rows.map((u) => ({
        ...u,
        date_registered: u.date_registered.toISOString(),
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Server error.", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
