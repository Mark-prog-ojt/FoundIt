import Link from "next/link";
import { AppShell } from "@/components/site/app-shell";
import { requireRole } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin } from "lucide-react";
import { LocationsAdmin } from "./locations-admin";

export default async function AdminLocationsPage() {
  await requireRole(["ADMIN"]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Admin</div>
            <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              View locations and usage counts. (Edits will be enabled later.)
            </div>
          </div>

          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/admin/dashboard">Back to admin dashboard</Link>
          </Button>
        </div>

        <Separator />

        <Card className="rounded-3xl p-6">
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-2xl border bg-muted/20">
              <MapPin className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Location directory</div>
              <div className="text-sm text-muted-foreground">
                Search and browse locations used by lost & found reports.
              </div>
            </div>
          </div>

          <Separator className="my-5" />

          <LocationsAdmin />
        </Card>
      </div>
    </AppShell>
  );
}
