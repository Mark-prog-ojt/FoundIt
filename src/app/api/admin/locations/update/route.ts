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
    const locationId = Number(body?.locationId);
    const locationName = String(body?.locationName || "").trim();
    const descriptionRaw = body?.description != null ? String(body.description) : "";
    const description = descriptionRaw.trim();

    if (!Number.isFinite(locationId)) {
      return NextResponse.json({ ok: false, error: "Invalid locationId." }, { status: 400 });
    }
    if (locationName.length < 2) {
      return NextResponse.json({ ok: false, error: "Location name is required." }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const ua = req.headers.get("user-agent") || null;

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.location.findUnique({
        where: { location_id: locationId },
        select: { location_id: true, location_name: true, description: true },
      });

      if (!before) throw new Error("NOT_FOUND");

      const loc = await tx.location.update({
        where: { location_id: locationId },
        data: {
          location_name: locationName,
          description: description.length ? description : null,
        },
        select: { location_id: true, location_name: true, description: true },
      });

      const changes: any = {};
      if (before.location_name !== loc.location_name) {
        changes.location_name = { from: before.location_name, to: loc.location_name };
      }
      if ((before.description ?? "") !== (loc.description ?? "")) {
        changes.description = { from: before.description ?? null, to: loc.description ?? null };
      }

      await tx.auditLog.create({
        data: {
          actor_user_id: actorUserId,
          action: "ADMIN_LOCATION_UPDATE",
          entity_type: "Location",
          entity_id: locationId,
          summary: `Updated location "${loc.location_name}"`,
          meta: {
            location_id: locationId,
            changes,
          },
          ip,
          user_agent: ua,
        },
      });

      return loc;
    });

    return NextResponse.json({ ok: true, location: updated }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ ok: false, error: "Location not found." }, { status: 404 });
    }
    if (String(e?.code || "") === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Location name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
