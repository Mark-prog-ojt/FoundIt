import { AppShell } from "@/components/site/app-shell";
import { requireRole } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { StaffFoundInventory } from "@/components/staff/staff-found-inventory";

export default async function StaffFoundPage() {
  await requireRole(["STAFF", "ADMIN"]);
  const session = await getSession();
  const role = String(session?.role || "STAFF").toUpperCase();

  return (
    <AppShell>
      <StaffFoundInventory role={role} />
    </AppShell>
  );
}
