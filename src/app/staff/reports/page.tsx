import { AppShell } from "@/components/site/app-shell";
import { requireRole } from "@/lib/rbac";
import { StaffReportsView } from "@/components/staff/staff-reports-view";
import { prisma } from "@/lib/db";

export default async function StaffReportsPage() {
  const session = await requireRole(["STAFF", "ADMIN"]);

  const rows = await prisma.lostItem.findMany({
    orderBy: { date_created: "desc" },
    take: 50,
    select: {
      lost_id: true,
      item_name: true,
      image: true,
      status: true,
      date_created: true,
      category: { select: { category_name: true } },
      location: { select: { location_name: true } },
    },
  });

  const items = rows.map((r) => ({
    report_id: r.lost_id,
    item_name: r.item_name,
    image: r.image,
    status: r.status,
    created_at: r.date_created.toISOString(),
    category_name: r.category.category_name,
    location_name: r.location.location_name,
  }));

  return (
    <AppShell>
      <StaffReportsView role={session.role} items={items} />
    </AppShell>
  );
}
