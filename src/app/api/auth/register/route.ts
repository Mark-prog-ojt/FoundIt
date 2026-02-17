import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const idNumber = String(body.idNumber || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!fullName || !idNumber || !email || !password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { id_number: idNumber }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email or ID number already exists." },
        { status: 409 }
      );
    }

    const userRole = await prisma.role.findFirst({ where: { role_name: "USER" } });
    if (!userRole) {
      return NextResponse.json({ error: "USER role not found." }, { status: 500 });
    }

    const hashed = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        role_id: userRole.role_id,
        full_name: fullName,
        id_number: idNumber,
        email,
        password: hashed,
        status: "ACTIVE",
      },
      select: {
        user_id: true,
        email: true,
        full_name: true,
        avatar_url: true,
        role: { select: { role_name: true } },
      },
    });

    await setSession({
      userId: user.user_id,
      role: user.role.role_name as "USER" | "STAFF" | "ADMIN",
      email: user.email,
      name: user.full_name,
      avatarUrl: user.avatar_url ?? null,
    });

    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
