import { AppShell } from "@/components/site/app-shell";
import { requireRole } from "@/lib/rbac";
import { AuditLogsView } from "./audit-logs-view";

export default async function AdminAuditPage() {
  await requireRole(["ADMIN"]);

  return (
    <AppShell containerClassName="w-full max-w-[1120px] px-6 lg:px-8 py-8">
      <AuditLogsView />
    </AppShell>
  );
}
