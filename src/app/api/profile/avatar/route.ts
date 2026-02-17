import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, setSession } from "@/lib/session";

function cleanString(v: unknown) {
  return String(v ?? "").trim();
}

function getIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip") || null;
}

function isValidAvatarUrl(v: string) {
  return v.startsWith("/uploads/avatars/");
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const raw = body?.avatarUrl ?? null;

    let avatarUrl: string | null = null;
    if (raw !== null && raw !== undefined) {
      const cleaned = cleanString(raw);
      if (cleaned) {
        if (cleaned.length > 200) {
          return NextResponse.json({ ok: false, error: "Avatar URL is too long." }, { status: 400 });
        }
        if (!isValidAvatarUrl(cleaned)) {
          return NextResponse.json({ ok: false, error: "Invalid avatar URL." }, { status: 400 });
        }
        avatarUrl = cleaned;
      }
    }

    const before = await prisma.user.findUnique({
      where: { user_id: session.userId },
      select: { avatar_url: true },
    });

    const updated = await prisma.user.update({
      where: { user_id: session.userId },
      data: { avatar_url: avatarUrl },
      select: {
        user_id: true,
        avatar_url: true,
        email: true,
        full_name: true,
        role: { select: { role_name: true } },
      },
    });

    await setSession({
      userId: updated.user_id,
      role: (updated.role.role_name as "USER" | "STAFF" | "ADMIN") ?? session.role,
      email: updated.email,
      name: updated.full_name,
      avatarUrl: updated.avatar_url ?? null,
    });

    try {
      await prisma.auditLog.create({
        data: {
          actor_user_id: session.userId,
          action: "PROFILE_AVATAR_UPDATE",
          entity_type: "User",
          entity_id: updated.user_id,
          summary: "User updated profile avatar",
          meta: {
            before,
            after: { avatar_url: updated.avatar_url },
          },
          ip: getIp(req),
          user_agent: req.headers.get("user-agent") || null,
        },
      });
    } catch (e) {
      console.warn("AuditLog write failed:", e);
    }

    return NextResponse.json({ ok: true, avatar_url: updated.avatar_url }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
