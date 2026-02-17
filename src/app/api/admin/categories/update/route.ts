import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

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
    const categoryId = Number(body?.categoryId);
    const categoryName = String(body?.categoryName || "").trim();

    if (!Number.isFinite(categoryId)) {
      return NextResponse.json({ ok: false, error: "Invalid categoryId." }, { status: 400 });
    }
    if (categoryName.length < 2) {
      return NextResponse.json({ ok: false, error: "Category name is required." }, { status: 400 });
    }
    if (categoryName.length > 50) {
      return NextResponse.json({ ok: false, error: "Category name is too long." }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const ua = req.headers.get("user-agent") || null;

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.category.findUnique({
        where: { category_id: categoryId },
        select: { category_id: true, category_name: true },
      });

      if (!before) {
        throw new Error("NOT_FOUND");
      }

      const after = await tx.category.update({
        where: { category_id: categoryId },
        data: { category_name: categoryName },
        select: { category_id: true, category_name: true },
      });

      await tx.auditLog.create({
        data: {
          actor_user_id: actorUserId,
          action: "ADMIN_CATEGORY_UPDATE",
          entity_type: "Category",
          entity_id: categoryId,
          summary: `Renamed category "${before.category_name}" -> "${after.category_name}"`,
          meta: {
            category_id: categoryId,
            from: before.category_name,
            to: after.category_name,
          },
          ip,
          user_agent: ua,
        },
      });

      return after;
    });

    return NextResponse.json({ ok: true, category: updated }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Category not found." }, { status: 404 });
    }

    // Prisma unique constraint (category_name)
    const code = String(e?.code || "");
    if (code === "P2002") {
      return NextResponse.json({ ok: false, error: "Category name already exists." }, { status: 409 });
    }

    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
