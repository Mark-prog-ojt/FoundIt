import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const MAX_PAGE_SIZE = 50;

function toInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

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
    const status = String(url.searchParams.get("status") || "ALL").toUpperCase(); // ACTIVE / INACTIVE / etc
    const roleName = String(url.searchParams.get("role") || "ALL").toUpperCase(); // USER/STAFF/ADMIN

    const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(url.searchParams.get("pageSize"), 20)));
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (status !== "ALL") {
      where.status = status;
    }

    if (roleName !== "ALL") {
      where.role = { role_name: roleName };
    }

    if (q.length > 0) {
      where.OR = [
        { full_name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { id_number: { contains: q, mode: "insensitive" } },
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
          role: { select: { role_name: true } },
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
        items: rows.map((u) => ({
          ...u,
          date_registered: u.date_registered.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String((session as any).role ?? "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const adminId = Number((session as any).userId ?? (session as any).user_id);
    if (!Number.isFinite(adminId)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = Number(body?.userId);
    const nextStatus = body?.status != null ? String(body.status).toUpperCase() : null;
    const nextRoleName = body?.role != null ? String(body.role).toUpperCase() : null;

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ ok: false, error: "Invalid userId." }, { status: 400 });
    }
    if (!nextStatus && !nextRoleName) {
      return NextResponse.json(
        { ok: false, error: "Provide at least one of: { status, role }." },
        { status: 400 }
      );
    }

    // basic IP/UA capture
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const ua = req.headers.get("user-agent") || null;

    const updated = await prisma.$transaction(async (tx) => {
      const data: any = {};

      if (nextStatus) data.status = nextStatus;

      if (nextRoleName) {
        const r = await tx.role.findFirst({
          where: { role_name: nextRoleName },
          select: { role_id: true, role_name: true },
        });
        if (!r) {
          throw new Error("INVALID_ROLE");
        }
        data.role_id = r.role_id;
      }

      const u = await tx.user.update({
        where: { user_id: userId },
        data,
        select: {
          user_id: true,
          full_name: true,
          email: true,
          status: true,
          role: { select: { role_name: true } },
        },
      });

      // audit
      await tx.auditLog.create({
        data: {
          actor_user_id: adminId,
          action: "USER_UPDATED",
          entity_type: "User",
          entity_id: userId,
          summary: `Updated user "${u.full_name}"`,
          meta: {
            user_id: userId,
            changes: {
              ...(nextStatus ? { status: nextStatus } : {}),
              ...(nextRoleName ? { role: nextRoleName } : {}),
            },
          },
          ip,
          user_agent: ua,
        },
      });

      return u;
    });

    return NextResponse.json({ ok: true, user: updated }, { status: 200 });
  } catch (e: any) {
    if (String(e?.message || "") === "INVALID_ROLE") {
      return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
