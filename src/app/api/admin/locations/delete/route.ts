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
    const locationId = Number(body?.locationId ?? body?.location_id);

    if (!Number.isFinite(locationId)) {
      return NextResponse.json({ ok: false, error: "Invalid locationId." }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      null;

    const ua = req.headers.get("user-agent") || null;

    const deleted = await prisma.$transaction(async (tx) => {
      const loc = await tx.location.findUnique({
        where: { location_id: locationId },
        select: { location_id: true, location_name: true, description: true },
      });

      if (!loc) throw new Error("NOT_FOUND");

      const [lostCount, foundCount] = await Promise.all([
        tx.lostItem.count({ where: { location_id: locationId } }),
        tx.foundItem.count({ where: { location_id: locationId } }),
      ]);

      if (lostCount > 0 || foundCount > 0) throw new Error("IN_USE");

      await tx.location.delete({ where: { location_id: locationId } });

      await tx.auditLog.create({
        data: {
          actor_user_id: actorUserId,
          action: "ADMIN_LOCATION_DELETE",
          entity_type: "Location",
          entity_id: locationId,
          summary: `Deleted location "${loc.location_name}"`,
          meta: {
            location_id: loc.location_id,
            location_name: loc.location_name,
            description: loc.description,
            lostCount,
            foundCount,
          },
          ip,
          user_agent: ua,
        },
      });

      return loc;
    });

    return NextResponse.json({ ok: true, deleted }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
    }
    if (msg === "IN_USE") {
      return NextResponse.json(
        { ok: false, error: "Cannot delete: location is referenced by lost/found items." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
