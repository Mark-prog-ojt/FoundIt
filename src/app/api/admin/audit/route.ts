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

    if (q.length) {
      const maybeId = Number(q);
      where.OR = [
        { action: { contains: q, mode: "insensitive" } },
        { entity_type: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        ...(Number.isFinite(maybeId) ? [{ entity_id: maybeId }, { audit_id: maybeId }] : []),
        {
          actor: {
            is: {
              OR: [
                { full_name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    const total = await prisma.auditLog.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        audit_id: true,
        actor_user_id: true,
        action: true,
        entity_type: true,
        entity_id: true,
        summary: true,
        meta: true,
        ip: true,
        user_agent: true,
        created_at: true,
        actor: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            role: { select: { role_name: true } },
          },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        page,
        pageSize,
        total,
        totalPages,
        items: rows.map((r) => ({
          ...r,
          created_at: r.created_at.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Server error.", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
