import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/rbac";
import { getReqIp, getReqUA } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();
    const lostId = Number(body.lostId);

    if (!Number.isFinite(lostId)) {
      return NextResponse.json({ error: "Invalid lostId." }, { status: 400 });
    }

    const ip = getReqIp(req);
    const ua = getReqUA(req);

    const report = await prisma.lostItem.findFirst({
      where: { lost_id: lostId },
      select: { lost_id: true, user_id: true, status: true, item_name: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const isOwner = report.user_id === session.userId;
    const canWithdraw = isOwner || session.role === "ADMIN";

    if (!canWithdraw) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (report.status === "CANCELLED") {
      return NextResponse.json({ ok: true, status: "CANCELLED" }, { status: 200 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.lostItem.update({
        where: { lost_id: lostId },
        data: { status: "CANCELLED" },
        select: { lost_id: true, status: true },
      });

      await tx.auditLog.create({
        data: {
          actor_user_id: session.userId,
          action: "LOST_REPORT_WITHDRAWN",
          entity_type: "LostItem",
          entity_id: lostId,
          summary: `Withdrew lost report "${report.item_name || "item"}"`,
          meta: {
            lost_id: lostId,
            owner_user_id: report.user_id,
            prev_status: report.status,
            new_status: "CANCELLED",
          },
          ip,
          user_agent: ua,
        },
      });

      return updated;
    });

    return NextResponse.json({ ok: true, lost: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
