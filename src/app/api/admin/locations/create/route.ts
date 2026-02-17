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
    const locationName = String(body?.locationName ?? body?.location_name ?? "").trim();
    const descriptionRaw = body?.description ?? null;
    const description = descriptionRaw == null ? null : String(descriptionRaw).trim();

    if (locationName.length < 2) {
      return NextResponse.json({ ok: false, error: "Location name is required." }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      null;

    const ua = req.headers.get("user-agent") || null;

    const created = await prisma.$transaction(async (tx) => {
      const loc = await tx.location.create({
        data: {
          location_name: locationName,
          description: description && description.length ? description : null,
        },
        select: { location_id: true, location_name: true, description: true },
      });

      await tx.auditLog.create({
        data: {
          actor_user_id: actorUserId,
          action: "ADMIN_LOCATION_CREATE",
          entity_type: "Location",
          entity_id: loc.location_id,
          summary: `Created location "${loc.location_name}"`,
          meta: {
            location_id: loc.location_id,
            location_name: loc.location_name,
            description: loc.description,
          },
          ip,
          user_agent: ua,
        },
      });

      return loc;
    });

    return NextResponse.json({ ok: true, created }, { status: 201 });
  } catch (e: any) {
    const code = String(e?.code || "");
    if (code === "P2002") {
      return NextResponse.json({ ok: false, error: "Location name already exists." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
