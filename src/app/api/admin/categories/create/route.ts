import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const role = String((session as any).role || "").toUpperCase();
    if (role !== "ADMIN") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const actorUserId = Number((session as any).userId ?? (session as any).user_id);
    if (!Number.isFinite(actorUserId)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const categoryName = String(body?.categoryName || "").trim();

    if (categoryName.length < 2) {
      return NextResponse.json({ ok: false, error: "categoryName is required." }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const ua = req.headers.get("user-agent") || null;

    const created = await prisma.$transaction(async (tx) => {
      const exists = await tx.category.findFirst({
        where: { category_name: { equals: categoryName, mode: "insensitive" } },
        select: { category_id: true },
      });
      if (exists) throw new Error("DUPLICATE");

      const row = await tx.category.create({
        data: { category_name: categoryName },
        select: { category_id: true, category_name: true },
      });

      await tx.auditLog.create({
        data: {
          actor_user_id: actorUserId,
          action: "ADMIN_CATEGORY_CREATE",
          entity_type: "Category",
          entity_id: row.category_id,
          summary: `Created category "${row.category_name}"`,
          meta: { category_id: row.category_id, category_name: row.category_name },
          ip,
          user_agent: ua,
        },
      });

      return row;
    });

    return NextResponse.json({ ok: true, category: created }, { status: 201 });
  } catch (e: any) {
    if (String(e?.message || "") === "DUPLICATE") {
      return NextResponse.json({ ok: false, error: "Category already exists." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
