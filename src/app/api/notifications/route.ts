import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limitRaw = Number(url.searchParams.get("limit") || 20);
    const limit = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 20));

    const [unreadCount, rows] = await Promise.all([
      prisma.notification.count({
        where: { user_id: session.userId, is_read: false },
      }),
      prisma.notification.findMany({
        where: { user_id: session.userId },
        orderBy: { created_at: "desc" },
        take: limit,
        select: {
          notification_id: true,
          type: true,
          title: true,
          message: true,
          href: true,
          is_read: true,
          created_at: true,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      unreadCount,
      notifications: rows.map((n) => ({
        ...n,
        created_at: n.created_at.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
