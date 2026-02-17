import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getSession } from "@/lib/session";
import { MyClaims } from "@/components/dashboard/my-claims";

export default async function ClaimsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/claims");
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Claims</div>
            <h1 className="text-2xl font-semibold tracking-tight">My Claims</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Track the status of claims you submitted for found items.
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/found">Browse found items</Link>
            </Button>
            <Button className="rounded-xl" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl p-6">
          <div className="font-semibold">Your claim history</div>
          <div className="text-sm text-muted-foreground">
            Approved claims mean the item is ready for release by the office.
          </div>
          <Separator className="my-5" />
          <MyClaims />
        </Card>
      </div>
    </AppShell>
  );
}
