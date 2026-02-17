import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { scoreLostVsFound } from "@/lib/matching";
import { getReqIp, getReqUA } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String(session.role || "").toUpperCase();
    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const categoryId = Number(body?.categoryId);
    const locationId = Number(body?.locationId);
    const itemName = String(body?.itemName || "").trim();
    const description = String(body?.description || "").trim();
    const storageLocation = String(body?.storageLocation || "").trim();
    const dateFoundStr = String(body?.dateFound || "").trim();
    const image = body?.image ? String(body.image).trim() : null;

    if (!Number.isFinite(categoryId) || !Number.isFinite(locationId)) {
      return NextResponse.json({ ok: false, error: "Invalid category/location." }, { status: 400 });
    }
    if (itemName.length < 2) {
      return NextResponse.json({ ok: false, error: "Item name is required." }, { status: 400 });
    }
    if (description.length < 5) {
      return NextResponse.json({ ok: false, error: "Description is required." }, { status: 400 });
    }
    if (storageLocation.length < 2) {
      return NextResponse.json({ ok: false, error: "Storage location is required." }, { status: 400 });
    }

    const dateFound = dateFoundStr ? new Date(dateFoundStr) : new Date();
    if (Number.isNaN(dateFound.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid dateFound." }, { status: 400 });
    }

    const ip = getReqIp(req);
    const ua = getReqUA(req);

    const created = await prisma.$transaction(async (tx) => {
      let matchesInserted = 0;
      let notificationsInserted = 0;

      // 1) Create found item
      const found = await tx.foundItem.create({
        data: {
          user_id: session.userId,
          category_id: categoryId,
          location_id: locationId,
          item_name: itemName,
          description,
          date_found: dateFound,
          storage_location: storageLocation,
          image: image && image.length ? image : null,
          status: "NEWLY_FOUND",
        },
        select: {
          found_id: true,
          item_name: true,
          description: true,
          date_found: true,
          image: true,
          category_id: true,
          location_id: true,
        },
      });

      // 2) Find candidate LOST reports (active only) in same category OR location
      const lostCandidates = await tx.lostItem.findMany({
        where: {
          status: "REPORTED_LOST",
          OR: [{ category_id: categoryId }, { location_id: locationId }],
        },
        take: 80,
        select: {
          lost_id: true,
          user_id: true,
          item_name: true,
          description: true,
          category_id: true,
          location_id: true,
          date_lost: true,
        },
      });

      // 3) Score candidates
      const foundInput = {
        item_name: found.item_name,
        description: found.description,
        category_id: found.category_id,
        location_id: found.location_id,
        date: new Date(found.date_found),
      };

      const scoredAll = lostCandidates.map((l) => {
        const lostInput = {
          item_name: l.item_name,
          description: l.description,
          category_id: l.category_id,
          location_id: l.location_id,
          date: new Date(l.date_lost),
        };
        const { score, reasons } = scoreLostVsFound(lostInput, foundInput);
        return { l, score, reasons };
      });

      // A) Persist suggested matches (write to `matches`)
      const scoredForMatches = scoredAll
        .filter((x) => x.score >= 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);

      if (scoredForMatches.length) {
        const mres = await tx.match.createMany({
          data: scoredForMatches.map((s) => ({
            lost_id: s.l.lost_id,
            found_id: found.found_id,
            match_score: s.score.toFixed(2),
          })),
          skipDuplicates: true,
        });
        matchesInserted = mres.count;
      }

      // B) Notifications only for strong matches
      const scoredForNotifs = scoredAll
        .filter((x) => x.score >= 40)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      if (scoredForNotifs.length) {
        // avoid spamming: 1 notif per user (best match only)
        const bestPerUser = new Map<number, { lost_id: number; score: number; reasons: string[] }>();
        for (const s of scoredForNotifs) {
          const uid = s.l.user_id;
          const existing = bestPerUser.get(uid);
          if (!existing || s.score > existing.score) {
            bestPerUser.set(uid, { lost_id: s.l.lost_id, score: s.score, reasons: s.reasons });
          }
        }

        const nres = await tx.notification.createMany({
          data: Array.from(bestPerUser.entries()).map(([userId, info]) => ({
            user_id: userId,
            type: "MATCH_SUGGESTED",
            title: "Possible match found",
            message: `A newly found item "${found.item_name}" may match your lost report (score ${info.score}). Reasons: ${info.reasons
              .slice(0, 2)
              .join(", ")}`,
            href: `/lost/${info.lost_id}`,
            is_read: false,
          })),
        });
        notificationsInserted = nres.count;
      }

      // ✅ Audit log
      await tx.auditLog.create({
        data: {
          actor_user_id: session.userId,
          action: "FOUND_ITEM_CREATED",
          entity_type: "FoundItem",
          entity_id: found.found_id,
          summary: `Created found item: "${found.item_name}"`,
          meta: {
            found_id: found.found_id,
            category_id: categoryId,
            location_id: locationId,
            status: "NEWLY_FOUND",
            date_found: dateFound.toISOString(),
            storage_location: storageLocation,
            has_image: Boolean(found.image),
            matches_inserted: matchesInserted,
            notifications_inserted: notificationsInserted,
          },
          ip,
          user_agent: ua,
        },
      });

      return found;
    });

    return NextResponse.json({ ok: true, found: created }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
