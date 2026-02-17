"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, ShieldCheck, Tag } from "lucide-react";
import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type FoundItem = {
  found_id: number;
  item_name: string;
  description: string;
  date_found: string;
  storage_location: string;
  image: string | null;
  status: string;
  category: { category_name: string };
  location: { location_name: string };
};

export default function NewClaimPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const foundIdRaw = sp.get("foundId");
  const foundId = foundIdRaw ? Number(foundIdRaw) : NaN;

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<FoundItem | null>(null);

  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  const statusLabel = useMemo(() => {
    if (!item?.status) return "";
    const s = String(item.status || "").toUpperCase();
    if (s === "NEWLY_FOUND") return "Newly found";
    if (s === "CLAIMED") return "Claimed";
    if (s === "RETURNED") return "Returned";
    return String(item.status || "")
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
  }, [item?.status]);

  const statusTone = useMemo(() => {
    const s = String(item?.status || "").toUpperCase();
    if (s === "CLAIMED") return "bg-zinc-500/12 text-zinc-700";
    if (s === "RETURNED") return "bg-blue-500/12 text-blue-700";
    return "bg-emerald-500/12 text-emerald-700";
  }, [item?.status]);

  async function loadItem() {
    if (!Number.isFinite(foundId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/found/get?foundId=${foundId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load item.");
        setItem(null);
        return;
      }
      setItem(data.item);
    } catch {
      toast.error("Failed to load item.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundIdRaw]);

  async function submit() {
    if (!item) return;

    const trimmed = details.trim();
    if (trimmed.length < 10) {
      toast.error("Please provide more details (at least 10 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/claims/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          foundId: item.found_id,
          claimDetails: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Claim failed.");
        return;
      }

      toast.success("Claim submitted.");
      router.push("/dashboard");
    } catch {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="-mx-4 rounded-[28px] bg-[radial-gradient(70%_60%_at_10%_-10%,rgba(127,1,1,0.12),transparent_60%),radial-gradient(55%_50%_at_90%_0%,rgba(127,1,1,0.06),transparent_55%),linear-gradient(180deg,#FDFCFB_0%,#FDFCFB_55%,#F8F7F6_100%)] px-4 py-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-6 text-[#111827]">
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
                    Claim request
                  </div>
                  <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-[30px]">
                    Start a Claim
                  </h1>
                  <p className="mt-1 text-sm text-[#6B7280]">
                    Provide proof that the found item belongs to you.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  className="rounded-2xl text-[#6B7280] transition hover:-translate-y-0.5 hover:bg-white/70 hover:text-[#111827]"
                  asChild
                >
                  <Link href="/found">Back to found list</Link>
                </Button>
              </div>
            </Card>
          </motion.div>

          {loading ? (
            <Card className="rounded-3xl border-0 bg-white/90 p-6 text-sm text-[#6B7280] shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
              Loading...
            </Card>
          ) : !Number.isFinite(foundId) || !item ? (
            <Card className="rounded-3xl border-0 bg-white/90 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
              <div className="font-semibold">Invalid or missing foundId</div>
              <div className="mt-1 text-sm text-[#6B7280]">
                Go back to the found items list and try again.
              </div>
              <div className="mt-4">
                <Button className="rounded-2xl" asChild>
                  <Link href="/found">Browse found items</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
              <Card className="rounded-3xl border-0 bg-white/92 shadow-[0_14px_40px_rgba(0,0,0,0.05)] ring-1 ring-[rgba(0,0,0,0.05)]">
                <div className="relative aspect-[16/10] overflow-hidden bg-[#F8F7F6]">
                  <div className="absolute inset-6">
                    <Image
                      src={item.image || "/found-placeholder.svg"}
                      alt={item.item_name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-[#F8F7F6]" />
                  <div className="absolute left-4 top-4">
                    <Badge
                      variant="secondary"
                      className={"rounded-full border-0 px-3 py-1 text-[11px] font-medium shadow-none " + statusTone}
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                </div>

                <div className="p-6">
                  <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#6B7280]">
                    You are claiming
                  </div>
                  <div className="mt-2 text-xl font-semibold text-[#111827]">{item.item_name}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#6B7280]">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="size-3" />
                      {item.category.category_name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {item.location.location_name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      Found {fmt.format(new Date(item.date_found))}
                    </span>
                  </div>

                  <Separator className="my-5" />

                  <div className="text-sm font-medium">Item description</div>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#6B7280] whitespace-pre-wrap">
                    {item.description}
                  </p>

                  <div className="mt-4 text-[12px] text-[#6B7280]">
                    Stored at:{" "}
                    <span className="font-medium text-[#111827]">{item.storage_location}</span>
                  </div>
                </div>
              </Card>

              <div className="flex h-fit flex-col gap-4 lg:sticky lg:top-24">
                <Card className="rounded-3xl border-0 bg-white/92 p-6 shadow-[0_14px_40px_rgba(0,0,0,0.06)] ring-1 ring-[rgba(0,0,0,0.05)]">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Claim details</div>
                    <span className="rounded-full border border-[rgba(0,0,0,0.06)] bg-white/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
                      3 steps
                    </span>
                  </div>
                  <div className="mt-2 text-[13px] leading-relaxed text-[#6B7280]">
                    Include proof like unique marks, contents, exact brand/model, or where you lost it.
                  </div>

                  <div className="relative mt-4 grid gap-2 text-[13px] text-[#6B7280]">
                    <div className="absolute left-[9px] top-2 hidden h-[58px] w-px bg-[#7F0101]/15 sm:block" />
                    {["Describe the item", "Provide proof", "Submit claim"].map((step, idx) => (
                      <div key={step} className="flex items-center gap-2">
                        <span className="flex size-[18px] items-center justify-center rounded-full bg-[#7F0101]/12 text-[10px] font-semibold text-[#7F0101]">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-5" />

                  <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-black/5 transition focus-within:-translate-y-0.5 focus-within:ring-2 focus-within:ring-[#7F0101]/25 focus-within:shadow-[0_10px_20px_rgba(127,1,1,0.12)]">
                    <Textarea
                      className="min-h-[160px] border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                      placeholder="Example: This is my wallet. It has a tear on the left corner and a PUP ID inside with my name. I lost it at the cafeteria around lunch..."
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>

                  <Button
                    className="mt-4 w-full rounded-2xl shadow-[0_10px_26px_rgba(127,1,1,0.25)] transition hover:-translate-y-0.5"
                    onClick={submit}
                    disabled={submitting}
                  >
                    {submitting ? "Submitting..." : "Submit claim"}
                  </Button>

                  <div className="mt-3 text-[11px] text-[#6B7280]">
                    Your claim will be reviewed by staff within 24–48 hours.
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
