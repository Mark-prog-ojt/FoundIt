import Link from "next/link";
import { AppShell } from "@/components/site/app-shell";
import { requireRole } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Users } from "lucide-react";
import { UsersAdmin } from "./users-admin";

export default async function AdminUsersPage() {
  await requireRole(["ADMIN"]);

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Admin</div>
            <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              View accounts and roles. (Actions will be enabled in Step 19.2)
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
              <Users className="size-5" />
            </div>
            <div>
              <div className="font-semibold">User directory</div>
              <div className="text-sm text-muted-foreground">
                Search and browse registered users.
              </div>
            </div>
          </div>

          <Separator className="my-5" />

          <UsersAdmin />
        </Card>
      </div>
    </AppShell>
  );
}
