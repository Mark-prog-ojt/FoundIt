import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

function toNum(x: unknown) {
  if (typeof x === "number") return x;
  if (typeof x === "bigint") return Number(x);
  return Number(x || 0);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String(session.role || "").toUpperCase();
    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const [
      totalLostReports,
      totalFoundItems,
      pendingClaims,
      claimedFoundItems,
      unclaimedFoundItems,
      topLostCategoriesRaw,
      topFoundCategoriesRaw,
      topLostLocationsRaw,
      topFoundLocationsRaw,
      monthlyRows,
    ] = await Promise.all([
      prisma.lostItem.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.foundItem.count(),
      prisma.claim.count({ where: { claim_status: "PENDING" } }),
      prisma.foundItem.count({ where: { status: "CLAIMED" } }),
      prisma.foundItem.count({ where: { status: { not: "CLAIMED" } } }),

      // NOTE: this Prisma version can't orderBy _count._all, so count a required field instead.
      prisma.lostItem.groupBy({
        by: ["category_id"],
        where: { status: { not: "CANCELLED" } },
        _count: { category_id: true },
        orderBy: { _count: { category_id: "desc" } },
        take: 6,
      }),
      prisma.foundItem.groupBy({
        by: ["category_id"],
        _count: { category_id: true },
        orderBy: { _count: { category_id: "desc" } },
        take: 6,
      }),
      prisma.lostItem.groupBy({
        by: ["location_id"],
        where: { status: { not: "CANCELLED" } },
        _count: { location_id: true },
        orderBy: { _count: { location_id: "desc" } },
        take: 6,
      }),
      prisma.foundItem.groupBy({
        by: ["location_id"],
        _count: { location_id: true },
        orderBy: { _count: { location_id: "desc" } },
        take: 6,
      }),

      // Last 12 months: lost reports + found items + claimed found items
      // NOTE: date_created is a DATE in this schema, so cast to timestamp for date_trunc.
      prisma.$queryRaw<
        Array<{ month: string; lost_reports: number; found_items: number; claimed_found: number }>
      >`
        WITH months AS (
          SELECT date_trunc('month', d)::date AS month
          FROM generate_series(
            date_trunc('month', now()) - interval '11 months',
            date_trunc('month', now()),
            interval '1 month'
          ) AS d
        ),
        lost AS (
          SELECT date_trunc('month', (date_created::timestamp))::date AS month, count(*)::int AS lost_reports
          FROM lost_items
          WHERE status <> 'CANCELLED'
          GROUP BY 1
        ),
        found AS (
          SELECT date_trunc('month', (date_created::timestamp))::date AS month,
                 count(*)::int AS found_items,
                 sum(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END)::int AS claimed_found
          FROM found_items
          GROUP BY 1
        )
        SELECT
          to_char(m.month, 'YYYY-MM') AS month,
          COALESCE(l.lost_reports, 0) AS lost_reports,
          COALESCE(f.found_items, 0) AS found_items,
          COALESCE(f.claimed_found, 0) AS claimed_found
        FROM months m
        LEFT JOIN lost l ON l.month = m.month
        LEFT JOIN found f ON f.month = m.month
        ORDER BY m.month ASC;
      `,
    ]);

    const catIds = Array.from(
      new Set([
        ...topLostCategoriesRaw.map((r) => r.category_id),
        ...topFoundCategoriesRaw.map((r) => r.category_id),
      ])
    );

    const locIds = Array.from(
      new Set([
        ...topLostLocationsRaw.map((r) => r.location_id),
        ...topFoundLocationsRaw.map((r) => r.location_id),
      ])
    );

    const [cats, locs] = await Promise.all([
      prisma.category.findMany({
        where: { category_id: { in: catIds.length ? catIds : [0] } },
        select: { category_id: true, category_name: true },
      }),
      prisma.location.findMany({
        where: { location_id: { in: locIds.length ? locIds : [0] } },
        select: { location_id: true, location_name: true },
      }),
    ]);

    const catMap = new Map(cats.map((c) => [c.category_id, c.category_name] as const));
    const locMap = new Map(locs.map((l) => [l.location_id, l.location_name] as const));

    const topLostCategories = topLostCategoriesRaw.map((r) => ({
      category_id: r.category_id,
      category_name: catMap.get(r.category_id) || `Category #${r.category_id}`,
      count: toNum((r as any)._count?.category_id),
    }));

    const topFoundCategories = topFoundCategoriesRaw.map((r) => ({
      category_id: r.category_id,
      category_name: catMap.get(r.category_id) || `Category #${r.category_id}`,
      count: toNum((r as any)._count?.category_id),
    }));

    const topLostLocations = topLostLocationsRaw.map((r) => ({
      location_id: r.location_id,
      location_name: locMap.get(r.location_id) || `Location #${r.location_id}`,
      count: toNum((r as any)._count?.location_id),
    }));

    const topFoundLocations = topFoundLocationsRaw.map((r) => ({
      location_id: r.location_id,
      location_name: locMap.get(r.location_id) || `Location #${r.location_id}`,
      count: toNum((r as any)._count?.location_id),
    }));

    const totalForRecovery = totalFoundItems || 0;
    const recoveryRate = totalForRecovery ? (claimedFoundItems / totalForRecovery) * 100 : 0;

    return NextResponse.json(
      {
        ok: true,
        totals: {
          totalLostReports,
          totalFoundItems,
          pendingClaims,
          claimedFoundItems,
          unclaimedFoundItems,
          recoveryRate: Number(recoveryRate.toFixed(2)),
        },
        topLostCategories,
        topFoundCategories,
        topLostLocations,
        topFoundLocations,
        monthly: monthlyRows,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {
        ok: false,
        error: "Server error.",
        detail:
          process.env.NODE_ENV === "development"
            ? String((err as any)?.message || err)
            : undefined,
      },
      { status: 500 }
    );
  }
}
