import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const ALLOWED = new Set(["ALL", "PENDING", "APPROVED", "DENIED"]);

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String(session.role || "").toUpperCase();
    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const statusRaw = String(url.searchParams.get("status") || "PENDING").toUpperCase();
    const status = ALLOWED.has(statusRaw) ? statusRaw : "PENDING";
    const q = String(url.searchParams.get("q") || "").trim();

    const where: any = {};

    if (status !== "ALL") {
      where.claim_status = status;
    }

    if (q.length > 0) {
      where.AND = [
        {
          OR: [
            { proof_description: { contains: q, mode: "insensitive" } },
            { claimant: { full_name: { contains: q, mode: "insensitive" } } },
            { claimant: { email: { contains: q, mode: "insensitive" } } },
            { found_item: { item_name: { contains: q, mode: "insensitive" } } },
            { found_item: { category: { category_name: { contains: q, mode: "insensitive" } } } },
            { found_item: { location: { location_name: { contains: q, mode: "insensitive" } } } },
          ],
        },
      ];
    }

    const orderBy =
      status === "PENDING"
        ? ({ date_claimed: "asc" } as const)
        : ({ date_claimed: "desc" } as const);

    const rows = await prisma.claim.findMany({
      where,
      orderBy,
      take: 50,
      select: {
        claim_id: true,
        claim_status: true,
        date_claimed: true,
        reviewed_at: true,
        proof_description: true,
        claimant: { select: { user_id: true, full_name: true, email: true } },
        verifier: { select: { user_id: true, full_name: true } },
        found_item: {
          select: {
            found_id: true,
            item_name: true,
            image: true,
            status: true,
            date_found: true,
            category: { select: { category_name: true } },
            location: { select: { location_name: true } },
          },
        },
      },
    });

    const claims = rows.map((c) => ({
      ...c,
      date_claimed: c.date_claimed.toISOString(),
      reviewed_at: c.reviewed_at ? c.reviewed_at.toISOString() : null,
      found_item: {
        ...c.found_item,
        date_found: c.found_item.date_found.toISOString(),
      },
    }));

    return NextResponse.json({ ok: true, claims }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
