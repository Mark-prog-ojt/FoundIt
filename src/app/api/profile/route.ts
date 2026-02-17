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

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: session.userId },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        id_number: true,
        department: true,
        avatar_url: true,
        status: true,
        date_registered: true,
        role: { select: { role_name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          user_id: user.user_id,
          full_name: user.full_name,
          email: user.email,
          id_number: user.id_number,
          department: user.department,
          avatar_url: user.avatar_url,
          status: user.status,
          date_registered: user.date_registered,
          role: user.role.role_name,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const fullName = cleanString(body.fullName);
    const departmentRaw = cleanString(body.department);

    if (!fullName) {
      return NextResponse.json({ ok: false, error: "Full name is required." }, { status: 400 });
    }
    if (fullName.length > 100) {
      return NextResponse.json({ ok: false, error: "Full name is too long." }, { status: 400 });
    }

    const department = departmentRaw ? departmentRaw : null;
    if (department && department.length > 50) {
      return NextResponse.json({ ok: false, error: "Department is too long." }, { status: 400 });
    }

    // Capture "before" for audit meta (lightweight)
    const before = await prisma.user.findUnique({
      where: { user_id: session.userId },
      select: { full_name: true, department: true, avatar_url: true },
    });

    const updated = await prisma.user.update({
      where: { user_id: session.userId },
      data: {
        full_name: fullName,
        department,
      },
      select: {
        user_id: true,
        full_name: true,
        email: true,
        id_number: true,
        department: true,
        avatar_url: true,
        status: true,
        date_registered: true,
        role: { select: { role_name: true } },
      },
    });

    // ✅ Refresh cookie session so Navbar can reflect updated name without re-login
    await setSession({
      userId: updated.user_id,
      role: (updated.role.role_name as "USER" | "STAFF" | "ADMIN") ?? session.role,
      email: updated.email,
      name: updated.full_name,
      avatarUrl: updated.avatar_url ?? null,
    });

    // ✅ Audit log (best effort)
    try {
      await prisma.auditLog.create({
        data: {
          actor_user_id: session.userId,
          action: "PROFILE_UPDATE",
          entity_type: "User",
          entity_id: updated.user_id,
          summary: "User updated profile",
          meta: {
            before,
            after: { full_name: updated.full_name, department: updated.department },
          },
          ip: getIp(req),
          user_agent: req.headers.get("user-agent") || null,
        },
      });
    } catch (e) {
      console.warn("AuditLog write failed:", e);
      // do not fail profile update for audit logging issues
    }

    return NextResponse.json(
      {
        ok: true,
        user: {
          user_id: updated.user_id,
          full_name: updated.full_name,
          email: updated.email,
          id_number: updated.id_number,
          department: updated.department,
          avatar_url: updated.avatar_url,
          status: updated.status,
          date_registered: updated.date_registered,
          role: updated.role.role_name,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
