import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/rbac";
import { scoreLostVsFound } from "@/lib/matching";
import { getReqIp, getReqUA } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const body = await req.json();

    const categoryId = Number(body.categoryId);
    const locationId = Number(body.locationId);
    const itemName = String(body.itemName || "").trim();
    const description = String(body.description || "").trim();
    const dateLost = String(body.dateLost || "").trim();
    const lastSeenLocation = String(body.lastSeenLocation || "").trim();
    const image = body.image ? String(body.image).trim() : null;

    if (!categoryId || !locationId || !itemName || !description || !dateLost || !lastSeenLocation) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateLost)) {
      return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD." }, { status: 400 });
    }

    const ip = getReqIp(req);
    const ua = getReqUA(req);

    const created = await prisma.$transaction(async (tx) => {
      // 1) Create the lost report
      const lost = await tx.lostItem.create({
        data: {
          user_id: session.userId,
          category_id: categoryId,
          location_id: locationId,
          item_name: itemName,
          description,
          date_lost: new Date(`${dateLost}T00:00:00.000Z`),
          last_seen_location: lastSeenLocation,
          image,
        },
        select: {
          lost_id: true,
          item_name: true,
          status: true,
          date_created: true,

          // needed for scoring
          description: true,
          category_id: true,
          location_id: true,
          date_lost: true,
        },
      });

      // 2) Find candidate FOUND items to match against (still available)
      const candidates = await tx.foundItem.findMany({
        where: {
          status: "NEWLY_FOUND",
          OR: [{ category_id: lost.category_id }, { location_id: lost.location_id }],
        },
        take: 100,
        select: {
          found_id: true,
          item_name: true,
          description: true,
          category_id: true,
          location_id: true,
          date_found: true,
        },
      });

      // 3) Score candidates
      const lostInput = {
        item_name: lost.item_name,
        description: lost.description,
        category_id: lost.category_id,
        location_id: lost.location_id,
        date: new Date(lost.date_lost),
      };

      const scoredAll = candidates.map((f) => {
        const foundInput = {
          item_name: f.item_name,
          description: f.description,
          category_id: f.category_id,
          location_id: f.location_id,
          date: new Date(f.date_found),
        };
        const { score, reasons } = scoreLostVsFound(lostInput, foundInput);
        return { found_id: f.found_id, item_name: f.item_name, score, reasons };
      });

      // 4) Persist top suggestions into `matches`
      const toStore = scoredAll
        .filter((x) => x.score >= 20)
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);

      if (toStore.length) {
        await tx.match.createMany({
          data: toStore.map((m) => ({
            lost_id: lost.lost_id,
            found_id: m.found_id,
            match_score: m.score.toFixed(2),
          })),
          skipDuplicates: true,
        });
      }

      // 5) Notify the reporting user if there are strong matches
      const bestStrong = scoredAll
        .filter((x) => x.score >= 40)
        .sort((a, b) => b.score - a.score)[0];

      if (bestStrong) {
        await tx.notification.create({
          data: {
            user_id: session.userId,
            type: "MATCH_SUGGESTED",
            title: "Possible match found",
            message: `We found a possible match for your lost report "${lost.item_name}" (best: "${bestStrong.item_name}", score ${bestStrong.score}). Reasons: ${bestStrong.reasons
              .slice(0, 2)
              .join(", ")}`,
            href: `/lost/${lost.lost_id}`,
            is_read: false,
          },
        });
      }

      // Audit log (lost report created)
      await tx.auditLog.create({
        data: {
          actor_user_id: session.userId,
          action: "LOST_ITEM_CREATED",
          entity_type: "LostItem",
          entity_id: lost.lost_id,
          summary: `Created lost report: "${lost.item_name}"`,
          meta: {
            lost_id: lost.lost_id,
            category_id: lost.category_id,
            location_id: lost.location_id,
            match_saved_count: toStore.length,
            notified: Boolean(bestStrong),
            best_match_found_id: bestStrong?.found_id ?? null,
            best_match_score: bestStrong?.score ?? null,
          },
          ip,
          user_agent: ua,
        },
      });

      // Return the original response shape
      return {
        lost_id: lost.lost_id,
        item_name: lost.item_name,
        status: lost.status,
        date_created: lost.date_created,
      };
    });

    return NextResponse.json({ ok: true, lost: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
