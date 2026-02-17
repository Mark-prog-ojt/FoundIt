import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

type SortBy = "date_created" | "date_found";
type SortDir = "asc" | "desc";

const ALLOWED_STATUSES = ["NEWLY_FOUND", "CLAIMED", "RETURNED"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(s: string): s is AllowedStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(s);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") || "").trim();
    const categoryIdRaw = url.searchParams.get("categoryId");
    const locationIdRaw = url.searchParams.get("locationId");
    const statusRaw = (url.searchParams.get("status") || "").trim().toUpperCase();
    const includeClaimedRaw = (url.searchParams.get("includeClaimed") || "").trim().toLowerCase();

    const dateFromRaw = (url.searchParams.get("dateFrom") || "").trim();
    const dateToRaw = (url.searchParams.get("dateTo") || "").trim();

    const sortByRaw = (url.searchParams.get("sortBy") || "date_created").trim() as SortBy;
    const sortDirRaw = (url.searchParams.get("sortDir") || "desc").trim() as SortDir;

    const pageRaw = url.searchParams.get("page") || "1";
    const pageSizeRaw = url.searchParams.get("pageSize") || "12";

    const categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;
    const locationId = locationIdRaw ? Number(locationIdRaw) : null;

    let page = Number(pageRaw);
    let pageSize = Number(pageSizeRaw);

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 12;
    if (pageSize > 50) pageSize = 50;

    const session = await getSession();
    const role = String(session?.role || "").toUpperCase();
    const isPrivileged = role === "STAFF" || role === "ADMIN";
    const includeClaimed = includeClaimedRaw === "1" || includeClaimedRaw === "true" || includeClaimedRaw === "yes";

    const where: any = {};

    if (categoryId && Number.isFinite(categoryId)) where.category_id = categoryId;
    if (locationId && Number.isFinite(locationId)) where.location_id = locationId;

    // Status rules:
    // - If status is explicitly RETURNED and user is NOT privileged: return 200 with empty results (no 403).
    // - If no explicit status filter:
    //     - Public: hide RETURNED and CLAIMED by default (unless includeClaimed=1)
    //     - Staff/Admin: show everything
    if (statusRaw && statusRaw !== "ALL") {
      if (!isAllowedStatus(statusRaw)) {
        return NextResponse.json(
          { ok: false, error: `Invalid status. Allowed: ALL, ${ALLOWED_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }

      if (statusRaw === "RETURNED" && !isPrivileged) {
        return NextResponse.json(
          { ok: true, items: [], page, pageSize, total: 0, totalPages: 1 },
          { status: 200 }
        );
      }

      where.status = statusRaw;
    } else {
      if (!isPrivileged) {
        if (includeClaimed) {
          where.status = { not: "RETURNED" };
        } else {
          where.status = { notIn: ["RETURNED", "CLAIMED"] };
        }
      }
    }

    if (q) {
      where.OR = [
        { item_name: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
        { storage_location: { contains: q, mode: "insensitive" as const } },
      ];
    }

    if (dateFromRaw || dateToRaw) {
      const dateFoundFilter: any = {};

      if (dateFromRaw) {
        const d = new Date(dateFromRaw);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { ok: false, error: "Invalid dateFrom. Use YYYY-MM-DD or ISO date." },
            { status: 400 }
          );
        }
        dateFoundFilter.gte = d;
      }

      if (dateToRaw) {
        const d = new Date(dateToRaw);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { ok: false, error: "Invalid dateTo. Use YYYY-MM-DD or ISO date." },
            { status: 400 }
          );
        }
        dateFoundFilter.lte = d;
      }

      where.date_found = dateFoundFilter;
    }

    const sortBy: SortBy = sortByRaw === "date_found" ? "date_found" : "date_created";
    const sortDir: SortDir = sortDirRaw === "asc" ? "asc" : "desc";

    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      prisma.foundItem.count({ where }),
      prisma.foundItem.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip,
        take: pageSize,
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
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json(
      { ok: true, items, page, pageSize, total, totalPages },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}
