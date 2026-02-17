import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getReqIp, getReqUA } from "@/lib/audit";

type Decision = "APPROVE" | "DENY";

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
    const claimId = Number(body?.claimId);
    const decision = String(body?.decision || "").toUpperCase() as Decision;

    if (!Number.isFinite(claimId)) {
      return NextResponse.json({ ok: false, error: "Invalid claimId." }, { status: 400 });
    }
    if (decision !== "APPROVE" && decision !== "DENY") {
      return NextResponse.json({ ok: false, error: "Invalid decision." }, { status: 400 });
    }

    const now = new Date();
    const ip = getReqIp(req);
    const ua = getReqUA(req);

    // Pull claimant + item name so we can notify + audit
    const claim = await prisma.claim.findFirst({
      where: { claim_id: claimId },
      select: {
        claim_id: true,
        claim_status: true,
        found_id: true,
        claimant_id: true,
        proof_description: true,
        found_item: { select: { item_name: true } },
      },
    });

    if (!claim) {
      return NextResponse.json({ ok: false, error: "Claim not found." }, { status: 404 });
    }
    if (String(claim.claim_status).toUpperCase() !== "PENDING") {
      return NextResponse.json({ ok: false, error: "Claim is not pending." }, { status: 409 });
    }

    const itemName = claim.found_item?.item_name || "your item";

    const result = await prisma.$transaction(async (tx) => {
      if (decision === "DENY") {
        const updated = await tx.claim.update({
          where: { claim_id: claimId },
          data: {
            claim_status: "DENIED",
            verified_by: session.userId,
            reviewed_at: now,
          },
          select: { claim_id: true, claim_status: true, verified_by: true, reviewed_at: true },
        });

        await tx.notification.create({
          data: {
            user_id: claim.claimant_id,
            type: "CLAIM_DENIED",
            title: "Claim denied",
            message: `Your claim for "${itemName}" was denied by staff.`,
            href: `/claims`,
            is_read: false,
          },
        });

        // ✅ Audit log
        await tx.auditLog.create({
          data: {
            actor_user_id: session.userId,
            action: "CLAIM_DENIED",
            entity_type: "Claim",
            entity_id: claimId,
            summary: `Denied claim for "${itemName}"`,
            meta: {
              claim_id: claimId,
              found_id: claim.found_id,
              claimant_id: claim.claimant_id,
            },
            ip,
            user_agent: ua,
          },
        });

        return { decision: "DENIED", updated };
      }

      // APPROVE
      const approved = await tx.claim.update({
        where: { claim_id: claimId },
        data: {
          claim_status: "APPROVED",
          verified_by: session.userId,
          reviewed_at: now,
        },
        select: { claim_id: true, claim_status: true, verified_by: true, reviewed_at: true, found_id: true },
      });

      await tx.foundItem.update({
        where: { found_id: claim.found_id },
        data: { status: "CLAIMED" },
      });

      // Auto-deny other pending claims for same found item + mark reviewed_at
      const deniedOthers = await tx.claim.updateMany({
        where: {
          found_id: claim.found_id,
          claim_status: "PENDING",
          NOT: { claim_id: claimId },
        },
        data: {
          claim_status: "DENIED",
          verified_by: session.userId,
          reviewed_at: now,
        },
      });

      await tx.notification.create({
        data: {
          user_id: claim.claimant_id,
          type: "CLAIM_APPROVED",
          title: "Claim approved",
          message: `Your claim for "${itemName}" was approved. Please coordinate pickup with the office.`,
          href: `/claims`,
          is_read: false,
        },
      });

      // ✅ Audit log
      await tx.auditLog.create({
        data: {
          actor_user_id: session.userId,
          action: "CLAIM_APPROVED",
          entity_type: "Claim",
          entity_id: claimId,
          summary: `Approved claim for "${itemName}"`,
          meta: {
            claim_id: claimId,
            found_id: claim.found_id,
            claimant_id: claim.claimant_id,
            auto_denied_count: deniedOthers.count,
          },
          ip,
          user_agent: ua,
        },
      });

      return { decision: "APPROVED", updated: approved };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
