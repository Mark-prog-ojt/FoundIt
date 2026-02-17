import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const ROLE_ALLOWED = new Set(["USER", "STAFF", "ADMIN"]);

// DB uses ACTIVE / INACTIVE, but UI might send DISABLED.
// We'll accept DISABLED as an alias for INACTIVE.
const STATUS_ALLOWED = new Set(["ACTIVE", "INACTIVE", "DISABLED"]);

function normalizeStatus(s: string) {
  const t = String(s || "").toUpperCase();
  if (t === "DISABLED") return "INACTIVE";
  return t;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String((session as any).role || "").toUpperCase();
    if (role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const actorUserId = Number((session as any).userId ?? (session as any).user_id);
    if (!Number.isFinite(actorUserId)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = Number(body?.userId);

    // Accept both: roleName (new) and role (old)
    const nextRoleRaw =
      body?.roleName != null ? String(body.roleName).toUpperCase()
      : body?.role != null ? String(body.role).toUpperCase()
      : null;

    const nextStatusRaw = body?.status != null ? String(body.status).toUpperCase() : null;
    const nextStatus = nextStatusRaw ? normalizeStatus(nextStatusRaw) : null;

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ ok: false, error: "Invalid userId." }, { status: 400 });
    }
    if (!nextRoleRaw && !nextStatus) {
      return NextResponse.json(
        { ok: false, error: "Provide at least one of: roleName/role, status." },
        { status: 400 }
      );
    }
    if (nextRoleRaw && !ROLE_ALLOWED.has(nextRoleRaw)) {
      return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
    }
    if (nextStatus && !STATUS_ALLOWED.has(nextStatusRaw!)) {
      return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 400 });
    }

    // safety: don't let admin change their own role/status via this endpoint
    if (userId === actorUserId) {
      return NextResponse.json(
        { ok: false, error: "You cannot modify your own account via this endpoint." },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      null;

    const ua = req.headers.get("user-agent") || null;

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          email: true,
          full_name: true,
          status: true,
          role: { select: { role_name: true } },
        },
      });

      if (!before) {
        throw new Error("NOT_FOUND");
      }

      let role_id: number | undefined = undefined;
      if (nextRoleRaw) {
        const roleRow = await tx.role.findFirst({
          where: { role_name: nextRoleRaw },
          select: { role_id: true },
        });
        if (!roleRow) throw new Error("ROLE_NOT_FOUND");
        role_id = roleRow.role_id;
      }

      const user = await tx.user.update({
        where: { user_id: userId },
        data: {
          ...(nextStatus ? { status: nextStatus } : {}),
          ...(role_id ? { role_id } : {}),
        },
        select: {
          user_id: true,
          email: true,
          full_name: true,
          status: true,
          role: { select: { role_name: true } },
        },
      });

      const changes: any = {};
      if (nextStatus) changes.status = { from: before.status, to: user.status };
      if (nextRoleRaw) changes.role = { from: before.role.role_name, to: user.role.role_name };

      await tx.auditLog.create({
        data: {
          actor_user_id: actorUserId,
          action: "ADMIN_USER_UPDATE",
          entity_type: "User",
          entity_id: userId,
          summary: `Updated user ${user.email}`,
          meta: { user_id: userId, email: user.email, changes },
          ip,
          user_agent: ua,
        },
      });

      return user;
    });

    // Return BOTH shapes so UI won’t break:
    return NextResponse.json({ ok: true, updated, user: updated }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
    }
    if (msg === "ROLE_NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Role not found in DB." }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
