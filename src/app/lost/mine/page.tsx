import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/rbac";

import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MyLostReports } from "@/components/dashboard/my-lost-reports";
import { Plus, Search } from "lucide-react";

export default async function LostMinePage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        {/* Keep this page minimal to avoid duplicate headers (the component already has its own header + toggle) */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/found">
              <Search className="mr-2 size-4" />
              Browse found
            </Link>
          </Button>

          <Button className="rounded-xl" asChild>
            <Link href="/lost/report">
              <Plus className="mr-2 size-4" />
              Report lost item
            </Link>
          </Button>
        </div>

        <Separator />

        <Card className="rounded-3xl p-6">
          <MyLostReports />
        </Card>
      </div>
    </AppShell>
  );
}
