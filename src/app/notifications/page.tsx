import Link from "next/link";
import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Bell } from "lucide-react";
import { NotificationsList } from "./notifications-list";

export default function NotificationsPage() {
  return (
    <AppShell>
      <div className="-mx-4 rounded-[28px] bg-[radial-gradient(70%_60%_at_10%_-10%,rgba(127,1,1,0.12),transparent_60%),radial-gradient(55%_50%_at_90%_0%,rgba(127,1,1,0.06),transparent_55%),linear-gradient(180deg,#FDFCFB_0%,#FDFCFB_55%,#F8F7F6_100%)] px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-6 text-[#111827]">
          <Card className="relative overflow-hidden rounded-3xl border-0 bg-white/88 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] ring-1 ring-[rgba(0,0,0,0.05)] backdrop-blur">
            <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[#7F0101]/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#7F0101]/8 blur-3xl" />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                  Inbox
                </div>
                <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-[30px]">
                  Notifications
                </h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Updates about claims, matches, and staff decisions.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-2xl bg-white/70" asChild>
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border-0 bg-white/92 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] ring-1 ring-[rgba(0,0,0,0.05)]">
            <div className="flex items-start gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-[#F8F7F6] text-[#111827] ring-1 ring-black/5">
                <Bell className="size-5" />
              </div>
              <div>
                <div className="text-base font-semibold">Your notifications</div>
                <div className="text-sm text-[#6B7280]">
                  Latest first. Unread items are highlighted.
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <NotificationsList />
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
