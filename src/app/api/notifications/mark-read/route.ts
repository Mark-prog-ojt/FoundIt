import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const all = body?.all === true;
    const notificationIdRaw = body?.notificationId;
    const notificationId = Number(notificationIdRaw);

    if (!all && !Number.isFinite(notificationId)) {
      return NextResponse.json(
        { ok: false, error: "Provide { all: true } or { notificationId }." },
        { status: 400 }
      );
    }

    if (all) {
      await prisma.notification.updateMany({
        where: { user_id: session.userId, is_read: false },
        data: { is_read: true },
      });
    } else {
      const updated = await prisma.notification.updateMany({
        where: { notification_id: notificationId, user_id: session.userId },
        data: { is_read: true },
      });

      if (updated.count === 0) {
        return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
      }
    }

    const unreadCount = await prisma.notification.count({
      where: { user_id: session.userId, is_read: false },
    });

    return NextResponse.json({ ok: true, unreadCount }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
