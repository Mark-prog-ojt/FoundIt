import Link from "next/link";
import { AppShell } from "@/components/site/app-shell";
import { requireRole } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tag } from "lucide-react";
import { CategoriesAdmin } from "./categories-admin";

export default async function AdminCategoriesPage() {
  await requireRole(["ADMIN"]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Admin</div>
            <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              Manage category master list (read-only for now).
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="rounded-xl">
                Step 23
              </Badge>
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
              <Tag className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Category directory</div>
              <div className="text-sm text-muted-foreground">
                Search and review categories used by lost & found items.
              </div>
            </div>
          </div>

          <Separator className="my-5" />

          <CategoriesAdmin />
        </Card>
      </div>
    </AppShell>
  );
}
