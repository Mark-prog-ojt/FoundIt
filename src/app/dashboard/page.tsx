import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getSession } from "@/lib/session";

import { MyLostReports } from "@/components/dashboard/my-lost-reports";
import { MyClaims } from "@/components/dashboard/my-claims";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "ADMIN") redirect("/admin/dashboard");
  if (session.role === "STAFF") redirect("/staff/dashboard");

  // USER dashboard
  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Dashboard</div>
            <h1 className="text-2xl font-semibold tracking-tight">Your Activity</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Track your lost reports and claims in one place.
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/found">Browse found items</Link>
            </Button>
            <Button className="rounded-xl" asChild>
              <Link href="/lost/report">Report lost item</Link>
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-3xl p-6">
            <MyLostReports />
          </Card>

          <Card className="rounded-3xl p-6">
            <MyClaims />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
