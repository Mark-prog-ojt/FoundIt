import { AppShell } from "@/components/site/app-shell";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { StaffDashboardView } from "@/components/staff/staff-dashboard-view";

export default async function StaffDashboardPage() {
  const session = await requireRole(["STAFF", "ADMIN"]);

  const [pendingRaw, pendingCount, claimedItemsCount, reviewedTodayCount] =
    await Promise.all([
      prisma.claim.findMany({
        where: { claim_status: "PENDING" },
        orderBy: { date_claimed: "asc" },
        take: 50,
        select: {
          claim_id: true,
          date_claimed: true,
          proof_description: true,
          claimant: { select: { user_id: true, full_name: true, email: true } },
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
      }),
      prisma.claim.count({ where: { claim_status: "PENDING" } }),
      prisma.foundItem.count({ where: { status: "CLAIMED" } }),
      prisma.claim.count({
        where: {
          reviewed_at: { not: null },
          reviewed_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

  const pending = pendingRaw.map((c) => ({
    ...c,
    date_claimed: c.date_claimed.toISOString(),
    found_item: {
      ...c.found_item,
      date_found: c.found_item.date_found.toISOString(),
    },
  }));

  return (
    <AppShell>
      <StaffDashboardView
        role={session.role}
        summary={{
          pendingCount,
          reviewedTodayCount,
          claimedItemsCount,
        }}
        pending={pending}
      />
    </AppShell>
  );
}
