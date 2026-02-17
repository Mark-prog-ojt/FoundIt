import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        password: true,
        status: true,
        avatar_url: true,
        role: { select: { role_name: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Account is not active." }, { status: 403 });
    }

    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    await setSession({
      userId: user.user_id,
      role: user.role.role_name as "USER" | "STAFF" | "ADMIN",
      email: user.email,
      name: user.full_name,
      avatarUrl: user.avatar_url ?? null,
    });

    return NextResponse.json(
      {
        ok: true,
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role.role_name,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
