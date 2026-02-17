import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { scoreLostVsFound } from "@/lib/matching";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const lostId = Number(url.searchParams.get("lostId"));
    if (!Number.isFinite(lostId)) {
      return NextResponse.json({ ok: false, error: "Invalid lostId" }, { status: 400 });
    }

    const lost = await prisma.lostItem.findFirst({
      where: { lost_id: lostId },
      select: {
        lost_id: true,
        user_id: true,
        item_name: true,
        description: true,
        category_id: true,
        location_id: true,
        date_lost: true,
        status: true,
      },
    });

    if (!lost) {
      return NextResponse.json({ ok: false, error: "Lost report not found" }, { status: 404 });
    }

    const isPrivileged = session.role === "STAFF" || session.role === "ADMIN";

    // Users can only request suggestions for their own report
    if (!isPrivileged && Number(lost.user_id) !== session.userId) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Candidate found items: same category OR same location
    // (we allow any status; UI will disable claim if already claimed)
    const candidates = await prisma.foundItem.findMany({
      where: {
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
        image: true,
        status: true,
        category: { select: { category_name: true } },
        location: { select: { location_name: true } },
      },
    });

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
      return {
        found_id: f.found_id,
        item_name: f.item_name,
        status: f.status,
        date_found: f.date_found.toISOString(),
        image: f.image || null,
        category: f.category,
        location: f.location,
        score,
        reasons,
      };
    });

    // Persist a wider net for later UI/analytics (top 30, >= 20)
    const toStore = scoredAll
      .filter((x) => x.score >= 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    // For display (top 10, >= 25)
    const toShow = scoredAll
      .filter((x) => x.score >= 25)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Overwrite stored matches for this lost report so Refresh actually refreshes
    await prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { lost_id: lostId } });

      if (toStore.length) {
        await tx.match.createMany({
          data: toStore.map((m) => ({
            lost_id: lostId,
            found_id: m.found_id,
            match_score: m.score.toFixed(2),
          })),
        });
      }
    });

    return NextResponse.json(
      {
        ok: true,
        lost: { lost_id: lost.lost_id, item_name: lost.item_name },
        matches: toShow,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
