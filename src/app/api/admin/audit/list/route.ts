import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String((session as any).role ?? "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);

    const q = String(url.searchParams.get("q") || "").trim();
    const action = String(url.searchParams.get("action") || "ALL").trim();
    const entityType = String(url.searchParams.get("entityType") || "ALL").trim();
    const actorUserIdRaw = String(url.searchParams.get("actorUserId") || "").trim();

    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(5, Number(url.searchParams.get("pageSize") || 20)));
    const skip = (page - 1) * pageSize;

    const fromRaw = String(url.searchParams.get("from") || "").trim(); // ISO date/time
    const toRaw = String(url.searchParams.get("to") || "").trim();

    const where: any = {};

    if (action && action !== "ALL") where.action = action;
    if (entityType && entityType !== "ALL") where.entity_type = entityType;

    const actorUserId = Number(actorUserIdRaw);
    if (actorUserIdRaw && Number.isFinite(actorUserId)) {
      where.actor_user_id = actorUserId;
    }

    if (fromRaw || toRaw) {
      where.created_at = {};
      if (fromRaw) {
        const from = new Date(fromRaw);
        if (!Number.isNaN(from.getTime())) where.created_at.gte = from;
      }
      if (toRaw) {
        const to = new Date(toRaw);
        if (!Number.isNaN(to.getTime())) where.created_at.lte = to;
      }
      // cleanup if invalid
      if (Object.keys(where.created_at).length === 0) delete where.created_at;
    }

    if (q.length > 0) {
      where.OR = [
        { action: { contains: q, mode: "insensitive" } },
        { entity_type: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
        {
          actor: {
            OR: [
              { full_name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
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
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
