import Link from "next/link";
import { AppShell } from "@/components/site/app-shell";
import { requireRole } from "@/lib/rbac";
import { getSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, PackagePlus, PackageSearch } from "lucide-react";
import { FoundCreateForm } from "./found-create-form";

export default async function StaffFoundNewPage() {
  await requireRole(["STAFF", "ADMIN"]);
  const session = await getSession();
  const role = String(session?.role || "STAFF").toUpperCase();

  return (
    <AppShell>
      <div className="-mx-4 rounded-[28px] bg-[radial-gradient(70%_60%_at_10%_-10%,rgba(127,1,1,0.12),transparent_60%),radial-gradient(55%_50%_at_90%_0%,rgba(127,1,1,0.06),transparent_55%),linear-gradient(180deg,#FDFCFB_0%,#FDFCFB_55%,#F8F7F6_100%)] px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-6 text-[#111827]">
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-white/88 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] ring-1 ring-[rgba(0,0,0,0.05)] backdrop-blur">
            <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[#7F0101]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#7F0101]/8 blur-3xl" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                  <PackagePlus className="size-3.5" />
                  Staff Console
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-[30px]">
                  Log New Found Item
                </h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Create a polished record for the public feed and internal tracking.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full px-3 py-1 text-[11px] font-medium">{role}</Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium">
                    Public feed
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-2xl bg-white/70" asChild>
                  <Link href="/staff/dashboard">
                    <ArrowLeft className="mr-2 size-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" className="rounded-2xl bg-white/70" asChild>
                  <Link href="/staff/found">
                    <PackageSearch className="mr-2 size-4" />
                    Inventory
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          <FoundCreateForm />
        </div>
      </div>
    </AppShell>
  );
}
