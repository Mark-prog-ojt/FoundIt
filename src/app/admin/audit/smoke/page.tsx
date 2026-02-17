import Link from "next/link";
import { AppShell } from "@/components/site/app-shell";
import { requireRole } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowUpRight, Activity } from "lucide-react";

export default async function AuditSmokePage() {
  await requireRole(["ADMIN"]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Admin</div>
            <h1 className="text-2xl font-semibold tracking-tight">Audit smoke test</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Quick check that the audit route responds.
            </div>
          </div>

          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/admin/audit">Back to audit logs</Link>
          </Button>
        </div>

        <Separator />

        <Card className="rounded-3xl p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Endpoint</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Opens the JSON response in a new tab:
              </div>
              <div className="mt-2 rounded-2xl border bg-muted/20 px-3 py-2 text-sm">
                <code>/api/audit/smoke</code>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/60 p-2.5 shadow-sm">
              <Activity className="size-5 text-muted-foreground" />
            </div>
          </div>

          <Separator className="my-5" />

          <Button className="rounded-xl" asChild>
            <a href="/api/audit/smoke" target="_blank" rel="noreferrer">
              Run smoke test <ArrowUpRight className="ml-2 size-4" />
            </a>
          </Button>

          <div className="mt-3 text-xs text-muted-foreground">
            If the response shows <span className="font-medium">ok: true</span>, the endpoint is healthy.
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
