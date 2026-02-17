"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardPlus,
  Search,
  ShieldCheck,
  Sparkles,
  FileClock,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MyLostReports } from "@/components/dashboard/my-lost-reports";
import { MyClaims } from "@/components/dashboard/my-claims";

type Session = {
  userId: number;
  name: string;
  email: string;
  role: string;
};

type Summary = {
  activeLostCount: number;
  totalClaimsCount: number;
  pendingClaimsCount: number;
};

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl p-5 transition hover:-translate-y-0.5 hover:bg-accent/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="rounded-2xl border bg-background/60 p-2.5 shadow-sm">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function DashboardView({
  session,
  summary,
}: {
  session: Session;
  summary: Summary;
}) {
  const isStaff = session.role === "STAFF" || session.role === "ADMIN";

  return (
    <div className="flex flex-col gap-4">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="relative overflow-hidden rounded-3xl border p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/40 to-slate-950/70" />
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-slate-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-slate-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-2xl border bg-background/40 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" />
                FoundIt Dashboard
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                Welcome back, {session.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed in as <span className="font-medium text-foreground">{session.email}</span>
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-xl">{session.role}</Badge>
                <Badge variant="secondary" className="rounded-xl">
                  Live status
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="rounded-xl transition hover:-translate-y-0.5" asChild>
                <Link href="/lost/report">
                  <ClipboardPlus className="mr-2 size-4" />
                  Report Lost
                </Link>
              </Button>

              <Button variant="outline" className="rounded-xl transition hover:-translate-y-0.5" asChild>
                <Link href="/found">
                  <Search className="mr-2 size-4" />
                  Browse Found
                </Link>
              </Button>

              {isStaff && (
                <Button variant="outline" className="rounded-xl transition hover:-translate-y-0.5" asChild>
                  <Link href="/staff/dashboard">
                    <ShieldCheck className="mr-2 size-4" />
                    Staff
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid gap-3 md:grid-cols-3"
      >
        <StatCard
          label="Active lost reports"
          value={summary.activeLostCount}
          icon={<LayoutDashboard className="size-5 text-muted-foreground" />}
        />
        <StatCard
          label="Total claims"
          value={summary.totalClaimsCount}
          icon={<FileClock className="size-5 text-muted-foreground" />}
        />
        <StatCard
          label="Pending claims"
          value={summary.pendingClaimsCount}
          icon={<ShieldCheck className="size-5 text-muted-foreground" />}
        />
      </motion.div>

      {/* Main sections */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="grid gap-4 lg:grid-cols-2"
      >
        <Card className="rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-2xl border bg-accent/30 p-2">
                  <LayoutDashboard className="size-4 text-muted-foreground" />
                </div>
                <div className="text-lg font-semibold">Your Lost Reports</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Toggle to include cancelled reports
              </div>
            </div>

            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/lost/report">New report</Link>
            </Button>
          </div>

          <Separator className="my-4" />
          <MyLostReports />
        </Card>

        <Card className="rounded-3xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-2xl border bg-accent/30 p-2">
                  <FileClock className="size-4 text-muted-foreground" />
                </div>
                <div className="text-lg font-semibold">My Claims</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                Track the status of items you claimed
              </div>
            </div>

            <Button variant="outline" className="rounded-xl" asChild>
              <Link href="/found">Browse found</Link>
            </Button>
          </div>

          <Separator className="my-4" />
          <MyClaims />
        </Card>
      </motion.div>
    </div>
  );
}
