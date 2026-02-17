import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getReqIp, getReqUA } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const foundId = Number(body?.foundId);
    const claimDetails = String(body?.claimDetails || "").trim();

    if (!Number.isFinite(foundId)) {
      return NextResponse.json({ ok: false, error: "Invalid foundId." }, { status: 400 });
    }
    if (claimDetails.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Claim details must be at least 10 characters." },
        { status: 400 }
      );
    }

    const ip = getReqIp(req);
    const ua = getReqUA(req);

    const found = await prisma.foundItem.findFirst({
      where: { found_id: foundId },
      select: { found_id: true, status: true, item_name: true },
    });

    if (!found) {
      return NextResponse.json({ ok: false, error: "Found item not found." }, { status: 404 });
    }

    const s = String(found.status || "").toUpperCase();

    // Only allow claims for items that are still available
    if (s !== "NEWLY_FOUND") {
      if (s === "CLAIMED") {
        return NextResponse.json({ ok: false, error: "This item has already been claimed." }, { status: 409 });
      }
      if (s === "RETURNED") {
        return NextResponse.json(
          { ok: false, error: "This item has already been returned and is no longer available." },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, error: "This item is not available for claiming." }, { status: 409 });
    }

    const existingPending = await prisma.claim.findFirst({
      where: {
        found_id: foundId,
        claimant_id: session.userId,
        claim_status: "PENDING",
      },
      select: { claim_id: true },
    });

    if (existingPending) {
      return NextResponse.json(
        { ok: false, error: "You already have a pending claim for this item." },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.claim.create({
        data: {
          found_id: foundId,
          claimant_id: session.userId,
          proof_description: claimDetails,
          claim_status: "PENDING",
        },
        select: { claim_id: true, claim_status: true, date_claimed: true },
      });

      await tx.auditLog.create({
        data: {
          actor_user_id: session.userId,
          action: "CLAIM_SUBMITTED",
          entity_type: "Claim",
          entity_id: created.claim_id,
          summary: `Submitted claim for found item #${foundId} (${found.item_name})`,
          meta: {
            claim_id: created.claim_id,
            found_id: foundId,
            claim_status: created.claim_status,
            proof_len: claimDetails.length,
          },
          ip,
          user_agent: ua,
        },
      });

      // Notify STAFF + ADMIN
      const [claimant, staffAdmins] = await Promise.all([
        tx.user.findUnique({
          where: { user_id: session.userId },
          select: { full_name: true, email: true },
        }),
        tx.user.findMany({
          where: {
            role: { role_name: { in: ["STAFF", "ADMIN"] } },
            status: "ACTIVE",
          },
          select: { user_id: true },
        }),
      ]);

      if (staffAdmins.length > 0) {
        const who = claimant?.full_name || claimant?.email || "A user";
        await tx.notification.createMany({
          data: staffAdmins.map((u) => ({
            user_id: u.user_id,
            type: "CLAIM_SUBMITTED",
            title: "New claim submitted",
            message: `${who} submitted a claim for "${found.item_name}" (Found #${found.found_id}).`,
            href: "/staff/dashboard",
            is_read: false,
          })),
        });
      }

      return created;
    });

    return NextResponse.json({ ok: true, claim: result }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
