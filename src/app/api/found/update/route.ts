import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getReqIp, getReqUA } from "@/lib/audit";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const ALLOWED_STATUSES = ["NEWLY_FOUND", "CLAIMED", "RETURNED"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(s: string): s is AllowedStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(s);
}

function normalizeForMeta(v: any) {
  if (v instanceof Date) return v.toISOString();
  return v;
}

function normalizePatchForMeta(patch: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(patch || {})) out[k] = normalizeForMeta(v);
  return out;
}

function pickBeforeForMeta(before: Record<string, any>, keys: string[]) {
  const out: Record<string, any> = {};
  for (const k of keys) out[k] = normalizeForMeta((before as any)?.[k]);
  return out;
}

function isLocalFoundUpload(u: string | null | undefined): u is string {
  return typeof u === "string" && u.startsWith("/uploads/found/");
}

async function safeUnlinkPublicUpload(urlPath: string) {
  // urlPath like "/uploads/found/<file>.jpg"
  const rel = urlPath.replace(/^\/+/, ""); // "uploads/found/<file>.jpg"
  const full = path.resolve(process.cwd(), "public", rel);
  const base = path.resolve(process.cwd(), "public", "uploads", "found");

  // Must stay inside /public/uploads/found
  if (!(full === base || full.startsWith(base + path.sep))) return;

  await fs.unlink(full).catch(() => {});
}

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

    const ip = getReqIp(req);
    const ua = getReqUA(req);

    const body = await req.json().catch(() => ({}));

    const foundId = Number(body?.foundId);
    if (!Number.isFinite(foundId)) {
      return NextResponse.json({ ok: false, error: "Invalid foundId." }, { status: 400 });
    }

    // Optional patch fields
    const categoryIdRaw = body?.categoryId;
    const locationIdRaw = body?.locationId;

    const itemNameRaw = body?.itemName;
    const descriptionRaw = body?.description;
    const storageLocationRaw = body?.storageLocation;
    const dateFoundRaw = body?.dateFound;
    const imageRaw = body?.image; // allow string | null | undefined
    const statusRaw = body?.status;

    const data: any = {};

    if (categoryIdRaw !== undefined) {
      const categoryId = Number(categoryIdRaw);
      if (!Number.isFinite(categoryId)) {
        return NextResponse.json({ ok: false, error: "Invalid categoryId." }, { status: 400 });
      }
      data.category_id = categoryId;
    }

    if (locationIdRaw !== undefined) {
      const locationId = Number(locationIdRaw);
      if (!Number.isFinite(locationId)) {
        return NextResponse.json({ ok: false, error: "Invalid locationId." }, { status: 400 });
      }
      data.location_id = locationId;
    }

    if (itemNameRaw !== undefined) {
      const itemName = String(itemNameRaw || "").trim();
      if (itemName.length < 2) {
        return NextResponse.json({ ok: false, error: "Item name is required." }, { status: 400 });
      }
      data.item_name = itemName;
    }

    if (descriptionRaw !== undefined) {
      const description = String(descriptionRaw || "").trim();
      if (description.length < 5) {
        return NextResponse.json({ ok: false, error: "Description is required." }, { status: 400 });
      }
      data.description = description;
    }

    if (storageLocationRaw !== undefined) {
      const storageLocation = String(storageLocationRaw || "").trim();
      if (storageLocation.length < 2) {
        return NextResponse.json(
          { ok: false, error: "Storage location is required." },
          { status: 400 }
        );
      }
      data.storage_location = storageLocation;
    }

    if (dateFoundRaw !== undefined) {
      const d = new Date(String(dateFoundRaw || "").trim());
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { ok: false, error: "Invalid dateFound. Use YYYY-MM-DD or ISO date." },
          { status: 400 }
        );
      }
      data.date_found = d;
    }

    // Allow clearing image by passing null or empty string
    if (imageRaw !== undefined) {
      if (imageRaw === null) {
        data.image = null;
      } else {
        const img = String(imageRaw || "").trim();
        data.image = img.length ? img : null;
      }
    }

    if (statusRaw !== undefined) {
      const status = String(statusRaw || "").trim().toUpperCase();
      if (!isAllowedStatus(status)) {
        return NextResponse.json(
          { ok: false, error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      data.status = status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: "No fields to update." }, { status: 400 });
    }

    const before = await prisma.foundItem.findUnique({
      where: { found_id: foundId },
      select: {
        found_id: true,
        item_name: true,
        description: true,
        date_found: true,
        storage_location: true,
        image: true,
        status: true,
        category_id: true,
        location_id: true,
      },
    });

    if (!before) {
      return NextResponse.json({ ok: false, error: "Found item not found." }, { status: 404 });
    }

    const keys = Object.keys(data);
    const patchMeta = normalizePatchForMeta(data);
    const beforeMeta = pickBeforeForMeta(before as any, keys);

    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.foundItem.update({
        where: { found_id: foundId },
        data,
        select: {
          found_id: true,
          item_name: true,
          description: true,
          date_found: true,
          storage_location: true,
          image: true,
          status: true,
          date_created: true,
          category: { select: { category_name: true } },
          location: { select: { location_name: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actor_user_id: session.userId,
          action: "FOUND_ITEM_UPDATED",
          entity_type: "FoundItem",
          entity_id: foundId,
          summary: `Updated found item "${before.item_name}"`,
          meta: {
            found_id: foundId,
            fields: keys,
            before: beforeMeta,
            after: patchMeta,
          },
          ip,
          user_agent: ua,
        },
      });

      return updated;
    });

    // Best-effort cleanup: delete old local upload if image changed/cleared
    if ("image" in data) {
      const oldImg = before.image;
      const newImg = updated.image;

      if (isLocalFoundUpload(oldImg) && oldImg !== newImg) {
        await safeUnlinkPublicUpload(oldImg);
      }
    }

    return NextResponse.json({ ok: true, updated }, { status: 200 });
  } catch (err) {
    const msg = String((err as any)?.message || "");
    if (msg.toLowerCase().includes("record to update not found")) {
      return NextResponse.json({ ok: false, error: "Found item not found." }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
