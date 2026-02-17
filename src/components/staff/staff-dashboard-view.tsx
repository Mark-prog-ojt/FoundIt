"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Inbox,
  CheckCircle2,
  PackageCheck,
  Plus,
  ArrowUpRight,
  Tag,
  MapPin,
  Calendar,
  Search,
  BadgeCheck,
  Clock3,
  BarChart3,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ClaimActions } from "@/components/staff/claim-actions";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";
import { toast } from "sonner";

type ClaimRow = {
  claim_id: number;
  claim_status: string;
  date_claimed: string; // ISO
  reviewed_at?: string | null; // ISO or null
  proof_description: string;
  claimant: { user_id: number; full_name: string; email: string };
  verifier?: { user_id: number; full_name: string } | null;
  found_item: {
    found_id: number;
    item_name: string;
    image: string | null;
    status: string;
    date_found: string; // ISO
    category: { category_name: string };
    location: { location_name: string };
  };
};

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card className="rounded-3xl border-0 bg-white/92 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(0,0,0,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#6B7280]">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">
            {value}
          </div>
        </div>
        <div className={"rounded-2xl p-2.5 ring-1 ring-black/5 " + tone}>{icon}</div>
      </div>
    </Card>
  );
}

const FILTERS = ["PENDING", "APPROVED", "DENIED", "ALL"] as const;
type Filter = (typeof FILTERS)[number];

function statusTone(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-500/12 text-emerald-700 ring-emerald-500/15";
  if (s === "DENIED") return "bg-rose-500/12 text-rose-700 ring-rose-500/20";
  return "bg-[#7F0101]/12 text-[#7F0101] ring-[#7F0101]/20";
}

export function StaffDashboardView({
  role,
  summary,
  pending, // initial data (pending only)
}: {
  role: string;
  summary: {
    pendingCount: number;
    reviewedTodayCount: number;
    claimedItemsCount: number;
  };
  pending: ClaimRow[];
}) {
  const router = useRouter();

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  const fmtTime = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    []
  );

  const [filter, setFilter] = useState<Filter>("PENDING");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<ClaimRow[]>(pending);

  // Debounce search to avoid spamming API
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  async function fetchClaims(nextFilter: Filter, nextQ: string) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", nextFilter);
      if (nextQ) params.set("q", nextQ);

      const res = await fetch(`/api/staff/claims?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load claims.");
        return;
      }

      setClaims(data.claims || []);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  // Refetch whenever filter or debounced search changes
  useEffect(() => {
    fetchClaims(filter, debouncedQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedQ]);

  async function refreshAfterAction() {
    router.refresh();
    await fetchClaims(filter, debouncedQ);
  }

  return (
    <div className="-mx-4 rounded-[28px] bg-[radial-gradient(70%_60%_at_10%_-10%,rgba(127,1,1,0.12),transparent_60%),radial-gradient(55%_50%_at_90%_0%,rgba(127,1,1,0.06),transparent_55%),linear-gradient(180deg,#FDFCFB_0%,#FDFCFB_55%,#F8F7F6_100%)] px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-6 text-[#111827]">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="relative overflow-hidden rounded-3xl border-0 bg-white/88 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.05)] ring-1 ring-[rgba(0,0,0,0.05)] backdrop-blur">
          <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-[#7F0101]/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-28 -bottom-28 h-72 w-72 rounded-full bg-[#7F0101]/8 blur-3xl" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                <ShieldCheck className="size-3.5" />
                Staff Console
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-[30px]">
                Claims Review
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Search, filter, approve or deny — updates instantly.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full px-3 py-1 text-[11px] font-medium">{role}</Badge>
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium">
                  Live queue
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="rounded-2xl px-5 shadow-[0_10px_26px_rgba(127,1,1,0.25)] transition hover:-translate-y-0.5"
                asChild
              >
                <Link href="/staff/found/new">
                  <Plus className="mr-2 size-4" />
                  New found item
                </Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl bg-white/70 transition hover:-translate-y-0.5 hover:bg-white"
                asChild
              >
                <Link href="/staff/found">
                  <PackageCheck className="mr-2 size-4" />
                  Inventory
                </Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl bg-white/70 transition hover:-translate-y-0.5 hover:bg-white"
                asChild
              >
                <Link href="/staff/reports">
                  <BarChart3 className="mr-2 size-4" />
                  Reports
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="rounded-2xl text-[#6B7280] transition hover:-translate-y-0.5 hover:bg-white/70 hover:text-[#111827]"
                asChild
              >
                <Link href="/found">
                  Browse found <ArrowUpRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid gap-4 md:grid-cols-3"
      >
        <StatCard
          label="Pending claims"
          value={summary.pendingCount}
          tone="bg-[#7F0101]/12 text-[#7F0101]"
          icon={<Inbox className="size-5" />}
        />
        <StatCard
          label="Reviewed today"
          value={summary.reviewedTodayCount}
          tone="bg-emerald-500/12 text-emerald-700"
          icon={<CheckCircle2 className="size-5" />}
        />
        <StatCard
          label="Claimed items"
          value={summary.claimedItemsCount}
          tone="bg-muted/70 text-muted-foreground"
          icon={<PackageCheck className="size-5" />}
        />
      </motion.div>

      {/* Controls + Queue */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <Card className="rounded-3xl border-0 bg-white/92 p-6 shadow-[0_12px_34px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold tracking-tight">Claims</div>
              <div className="mt-1 text-sm text-[#6B7280]">Filter and search across claim history.</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-[340px]">
                <Search className="absolute left-3 top-2.5 size-4 text-[#6B7280]" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search item, claimant, email, proof…"
                  className="rounded-2xl bg-white/80 pl-9 ring-1 ring-black/5 transition focus-visible:ring-[#7F0101]/25"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-full bg-[#F8F7F6] p-1 ring-1 ring-black/5">
              {FILTERS.map((f) => {
                const active = f === filter;
                return (
                  <Button
                    key={f}
                    type="button"
                    variant="ghost"
                    className={
                      "rounded-full px-4 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition " +
                      (active
                        ? "bg-white text-[#111827] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                        : "text-[#6B7280] hover:bg-white/70 hover:text-[#111827]")
                    }
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </Button>
                );
              })}
            </div>

            {loading && <span className="ml-2 text-xs text-[#6B7280]">Loading…</span>}
          </div>

          <Separator className="my-5" />

          {loading && claims.length === 0 ? (
            <LoadingGrid
              count={3}
              cardClassName="bg-white/70 shadow-none"
            />
          ) : claims.length === 0 ? (
            <EmptyState
              title="No results"
              description="Try changing the filter or search keywords."
              className="bg-white/70 shadow-none"
            />
          ) : (
            <div className="grid gap-3">
              {claims.map((c) => {
                const reviewed = c.reviewed_at ? fmtTime.format(new Date(c.reviewed_at)) : null;
                const claimedAt = fmt.format(new Date(c.date_claimed));
                const pill = statusTone(c.claim_status);

                return (
                  <Card
                    key={c.claim_id}
                    className="rounded-3xl border-0 bg-white/90 p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="relative h-24 w-32 overflow-hidden rounded-2xl bg-[#F8F7F6] ring-1 ring-black/5">
                          <Image
                            src={c.found_item.image || "/found-placeholder.svg"}
                            alt={c.found_item.item_name}
                            fill
                            className="object-contain"
                            sizes="(max-width: 1024px) 100vw, 240px"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-base font-semibold text-[#111827]">
                              {c.found_item.item_name}
                            </div>

                            <span
                              className={
                                "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 " +
                                pill
                              }
                            >
                              {String(c.claim_status).toUpperCase()}
                            </span>

                            {String(c.found_item.status).toUpperCase() === "CLAIMED" ? (
                              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-medium">
                                Item claimed
                              </Badge>
                            ) : null}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#6B7280]">
                            <span className="inline-flex items-center gap-1">
                              <Tag className="size-3" />
                              {c.found_item.category.category_name}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" />
                              {c.found_item.location.location_name}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="size-3" />
                              Submitted: {claimedAt}
                            </span>

                            {reviewed ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="size-3" />
                                Reviewed: {reviewed}
                              </span>
                            ) : null}

                            {c.verifier?.full_name ? (
                              <span className="inline-flex items-center gap-1">
                                <BadgeCheck className="size-3" />
                                By: {c.verifier.full_name}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 text-[13px] text-[#6B7280]">
                            Claimant:{" "}
                            <span className="font-medium text-[#111827]">{c.claimant.full_name}</span>{" "}
                            <span className="text-[#6B7280]">({c.claimant.email})</span>
                          </div>

                          <div className="mt-2 text-[13px] text-[#6B7280] line-clamp-2">
                            Proof: <span className="text-[#111827]/80">{c.proof_description}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" className="rounded-2xl" asChild>
                          <Link href={`/found/${c.found_item.found_id}`}>View item</Link>
                        </Button>

                        {String(c.claim_status).toUpperCase() === "PENDING" ? (
                          <ClaimActions claimId={c.claim_id} onDone={refreshAfterAction} />
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>
      </div>
    </div>
  );
}
