import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getSession().catch(() => null);

    const ua = req.headers.get("user-agent")?.slice(0, 200) ?? null;
    const ip =
      (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null) ||
      (req.headers.get("x-real-ip") ?? null);

    const row = await prisma.auditLog.create({
      data: {
        actor_user_id: session?.userId ?? null,
        action: "SMOKE_AUDIT_CREATE",
        entity_type: "Smoke",
        entity_id: null,
        summary: "Smoke test insert from /api/audit/smoke",
        meta: { ok: true, at: new Date().toISOString() },
        ip,
        user_agent: ua,
      },
      select: { audit_id: true, action: true, entity_type: true, actor_user_id: true, created_at: true },
    });

    const count = await prisma.auditLog.count();

    return NextResponse.json(
      {
        ok: true,
        inserted: { ...row, created_at: row.created_at.toISOString() },
        total: count,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Smoke insert failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
