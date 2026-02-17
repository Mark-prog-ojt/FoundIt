import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/rbac";

import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MyClaims } from "@/components/dashboard/my-claims";
import { Search } from "lucide-react";

export default async function ClaimsMinePage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/found">
              <Search className="mr-2 size-4" />
              Browse found
            </Link>
          </Button>
        </div>

        <Separator />

        <Card className="rounded-3xl p-6">
          <MyClaims />
        </Card>
      </div>
    </AppShell>
  );
}
