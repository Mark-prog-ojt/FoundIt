"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";
import { FileCheck2, FileClock, FileX2, ArrowUpRight, MapPin, Tag } from "lucide-react";

type Claim = {
  claim_id: number;
  claim_status: string;
  date_claimed: string;
  proof_description: string;
  found_item: {
    found_id: number;
    item_name: string;
    status: string;
    date_found: string;
    category: { category_name: string };
    location: { location_name: string };
  };
};

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  const v = (s || "").toUpperCase();
  if (v === "APPROVED") return "default";
  if (v === "DENIED") return "destructive";
  if (v === "PENDING") return "secondary";
  return "outline";
}

function statusBadgeTone(s: string) {
  const v = (s || "").toUpperCase();
  if (v === "APPROVED") return "bg-emerald-500/12 text-emerald-700 border-emerald-500/20";
  return "";
}

function statusIcon(s: string) {
  const v = (s || "").toUpperCase();
  if (v === "APPROVED") return <FileCheck2 className="size-4 text-foreground/70" />;
  if (v === "DENIED") return <FileX2 className="size-4 text-foreground/70" />;
  return <FileClock className="size-4 text-foreground/70" />;
}

export function MyClaims() {
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }),
    []
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/claims/mine", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load claims.");
        return;
      }

      setClaims(data.claims || []);
    } catch {
      toast.error("Failed to load claims.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <LoadingGrid count={4} />;
  }

  if (claims.length === 0) {
    return (
      <EmptyState
        title="No claims yet"
        description="Browse found items and submit a claim if you see yours."
        icon={<FileClock className="size-5" />}
      />
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden">
      {claims.map((c, idx) => (
        <div key={c.claim_id}>
          <Link href={`/found/${c.found_item.found_id}`} className="group block">
            <Card className="rounded-none border-0 p-4 transition hover:bg-accent/40 hover:shadow-sm hover:translate-x-[2px]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <div className="rounded-xl border bg-background/60 p-2 shadow-sm">
                      {statusIcon(c.claim_status)}
                    </div>
                    <div>
                      <div className="font-semibold underline-offset-4 group-hover:underline">
                        {c.found_item.item_name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Tag className="size-3" />
                          {c.found_item.category.category_name}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {c.found_item.location.location_name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    <span className="text-muted-foreground">Proof:</span>{" "}
                    {c.proof_description}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={statusVariant(c.claim_status)}
                    className={"rounded-xl " + statusBadgeTone(c.claim_status)}
                  >
                    {c.claim_status}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    Submitted: {fmt.format(new Date(c.date_claimed))}
                  </div>

                  <div className="inline-flex items-center gap-1 text-xs text-foreground/70">
                    View <ArrowUpRight className="size-3" />
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          {idx !== claims.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
