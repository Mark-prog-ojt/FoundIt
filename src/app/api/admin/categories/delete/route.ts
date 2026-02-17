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
    const categoryId = Number(body?.categoryId);

    if (!Number.isFinite(categoryId)) {
      return NextResponse.json({ ok: false, error: "categoryId is required." }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const ua = req.headers.get("user-agent") || null;

    const deleted = await prisma.$transaction(async (tx) => {
      const cat = await tx.category.findUnique({
        where: { category_id: categoryId },
        select: { category_id: true, category_name: true },
      });
      if (!cat) throw new Error("NOT_FOUND");

      const [lostCount, foundCount] = await Promise.all([
        tx.lostItem.count({ where: { category_id: categoryId } }),
        tx.foundItem.count({ where: { category_id: categoryId } }),
      ]);

      if (lostCount > 0 || foundCount > 0) throw new Error("IN_USE");

      await tx.category.delete({ where: { category_id: categoryId } });

      await tx.auditLog.create({
        data: {
          actor_user_id: actorUserId,
          action: "ADMIN_CATEGORY_DELETE",
          entity_type: "Category",
          entity_id: categoryId,
          summary: `Deleted category "${cat.category_name}"`,
          meta: { category_id: categoryId, category_name: cat.category_name },
          ip,
          user_agent: ua,
        },
      });

      return cat;
    });

    return NextResponse.json({ ok: true, deleted }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "NOT_FOUND") return NextResponse.json({ ok: false, error: "Category not found." }, { status: 404 });
    if (msg === "IN_USE") return NextResponse.json({ ok: false, error: "Category is in use and cannot be deleted." }, { status: 409 });
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
