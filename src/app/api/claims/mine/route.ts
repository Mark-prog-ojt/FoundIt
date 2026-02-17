import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const claims = await prisma.claim.findMany({
      where: { claimant_id: session.userId },
      orderBy: { date_claimed: "desc" },
      take: 25,
      select: {
        claim_id: true,
        claim_status: true,
        date_claimed: true,
        proof_description: true,
        found_item: {
          select: {
            found_id: true,
            item_name: true,
            status: true,
            date_found: true,
            category: { select: { category_name: true } },
            location: { select: { location_name: true } },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, claims }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
