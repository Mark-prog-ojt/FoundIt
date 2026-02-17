import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getSession } from "@/lib/session";
import { MyLostReports } from "@/components/dashboard/my-lost-reports";

export default async function LostPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/lost");
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Lost</div>
            <h1 className="text-2xl font-semibold tracking-tight">My Lost Reports</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Track reports you submitted and withdraw ones that are no longer needed.
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button className="rounded-xl" asChild>
              <Link href="/lost/report">Report lost item</Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-3xl p-6">
          <div className="font-semibold">Your reports</div>
          <div className="text-sm text-muted-foreground">
            Withdrawn reports are excluded by default unless you toggle “include cancelled”.
          </div>
          <Separator className="my-5" />
          <MyLostReports />
        </Card>
      </div>
    </AppShell>
  );
}
