import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getReqIp, getReqUA } from "@/lib/audit";

type Mode = "RETURN" | "DELETE";

function getActorUserId(session: any): number | null {
  const id = Number(session?.userId ?? session?.user_id);
  return Number.isFinite(id) ? id : null;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String((session as any).role || "").toUpperCase();
    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const actorUserId = getActorUserId(session);
    if (!actorUserId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const foundId = Number(body?.foundId);
    const mode = String(body?.mode || "RETURN").toUpperCase() as Mode;

    if (!Number.isFinite(foundId)) {
      return NextResponse.json({ ok: false, error: "Invalid foundId." }, { status: 400 });
    }
    if (mode !== "RETURN" && mode !== "DELETE") {
      return NextResponse.json({ ok: false, error: "Invalid mode. Use RETURN or DELETE." }, { status: 400 });
    }

    const ip = getReqIp(req);
    const ua = getReqUA(req);
    const now = new Date();

    const found = await prisma.foundItem.findFirst({
      where: { found_id: foundId },
      select: { found_id: true, item_name: true, status: true },
    });

    if (!found) {
      return NextResponse.json({ ok: false, error: "Found item not found." }, { status: 404 });
    }

    const itemName = found.item_name || "item";
    const prevStatus = String(found.status || "").toUpperCase();

    const result = await prisma.$transaction(async (tx) => {
      if (mode === "RETURN") {
        if (prevStatus === "RETURNED") {
          return { blocked: true, reason: "This item has already been returned and is no longer available." };
        }

        // Mark item as returned
        const updated = await tx.foundItem.update({
          where: { found_id: foundId },
          data: { status: "RETURNED" },
          select: { found_id: true, status: true },
        });

        // Remove matches (no more suggestions needed)
        const matchesDeleted = await tx.match.deleteMany({ where: { found_id: foundId } });

        // Auto-deny pending claims (keep APPROVED/DENIED history intact)
        const pending = await tx.claim.findMany({
          where: { found_id: foundId, claim_status: "PENDING" },
          select: { claim_id: true, claimant_id: true },
        });

        let deniedPendingCount = 0;

        if (pending.length) {
          const upd = await tx.claim.updateMany({
            where: { found_id: foundId, claim_status: "PENDING" },
            data: {
              claim_status: "DENIED",
              verified_by: actorUserId,
              reviewed_at: now,
            },
          });
          deniedPendingCount = upd.count;

          // Notify each claimant
          await tx.notification.createMany({
            data: pending.map((p) => ({
              user_id: p.claimant_id,
              type: "CLAIM_DENIED",
              title: "Claim closed",
              message: `Your claim for "${itemName}" was closed because the item has been returned.`,
              href: `/claims`,
              is_read: false,
            })),
          });

          // Audit each denied claim (optional but nice for traceability)
          await tx.auditLog.createMany({
            data: pending.map((p) => ({
              actor_user_id: actorUserId,
              action: "CLAIM_DENIED",
              entity_type: "Claim",
              entity_id: p.claim_id,
              summary: `Auto-denied claim (item returned) for "${itemName}"`,
              meta: { claim_id: p.claim_id, found_id: foundId, reason: "ITEM_RETURNED" },
              ip,
              user_agent: ua,
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            actor_user_id: actorUserId,
            action: "FOUND_ITEM_RETURNED",
            entity_type: "FoundItem",
            entity_id: foundId,
            summary: `Marked found item as RETURNED: "${itemName}"`,
            meta: {
              found_id: foundId,
              prev_status: prevStatus,
              matches_deleted: matchesDeleted.count,
              pending_claims_denied: deniedPendingCount,
            },
            ip,
            user_agent: ua,
          },
        });

        return {
          mode,
          updated,
          matchesDeleted: matchesDeleted.count,
          deniedPendingCount,
        };
      }

      // DELETE (hard delete) - block if there are claims (any status)
      const claimsCount = await tx.claim.count({ where: { found_id: foundId } });
      if (claimsCount > 0) {
        return {
          blocked: true,
          reason: "This found item has claims. Use RETURN instead of DELETE.",
          claimsCount,
        };
      }

      await tx.match.deleteMany({ where: { found_id: foundId } });
      await tx.foundItem.delete({ where: { found_id: foundId } });

      await tx.auditLog.create({
        data: {
          actor_user_id: actorUserId,
          action: "FOUND_ITEM_DELETED",
          entity_type: "FoundItem",
          entity_id: foundId,
          summary: `Deleted found item: "${itemName}"`,
          meta: { found_id: foundId, prev_status: prevStatus },
          ip,
          user_agent: ua,
        },
      });

      return { mode, deleted: true };
    });

    if ((result as any)?.blocked) {
      return NextResponse.json(
        { ok: false, error: (result as any).reason, detail: result },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
