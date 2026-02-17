"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";
import { MapPin, Tag, Calendar, ArrowUpRight, AlertCircle, Ban } from "lucide-react";

type Report = {
  lost_id: number;
  item_name: string;
  status: string;
  date_lost: string;
  date_created: string;
  category: { category_name: string };
  location: { location_name: string };
};

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  const v = (s || "").toUpperCase();
  if (v === "CANCELLED") return "destructive";
  if (v === "REPORTED_LOST") return "secondary";
  return "outline";
}

function statusIcon(s: string) {
  const v = (s || "").toUpperCase();
  if (v === "CANCELLED") return <Ban className="size-4 text-foreground/70" />;
  return <AlertCircle className="size-4 text-foreground/70" />;
}

export function MyLostReports() {
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);

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
      const url = includeCancelled ? "/api/lost/mine?includeCancelled=1" : "/api/lost/mine";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load reports.");
        return;
      }

      setReports(data.reports || []);
    } catch {
      toast.error("Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCancelled]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Your Lost Reports</div>
          <div className="text-sm text-muted-foreground">
            {includeCancelled ? "Including cancelled reports" : "Active reports only"}
          </div>
        </div>

        <label className="flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm transition hover:bg-accent/40">
          <span className="text-muted-foreground">Show cancelled</span>
          <Switch checked={includeCancelled} onCheckedChange={setIncludeCancelled} />
        </label>
      </div>

      {loading ? (
        <LoadingGrid count={4} />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No reports found"
          description={includeCancelled ? "You have no reports yet." : "You have no active reports right now."}
          icon={<AlertCircle className="size-5" />}
        />
      ) : (
        <div className="rounded-2xl border overflow-hidden">
          {reports.map((r, idx) => (
            <div key={r.lost_id}>
              <Link href={`/lost/${r.lost_id}`} className="group block">
                <Card className="rounded-none border-0 p-4 transition hover:bg-accent/40 hover:shadow-sm hover:translate-x-[2px]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl border bg-background/60 p-2 shadow-sm">
                          {statusIcon(r.status)}
                        </div>
                        <div>
                          <div className="font-semibold underline-offset-4 group-hover:underline">
                            {r.item_name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Tag className="size-3" />
                              {r.category.category_name}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="size-3" />
                              {r.location.location_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3" /> Lost: {fmt.format(new Date(r.date_lost))}
                        </span>
                        <span className="text-muted-foreground/60">•</span>
                        <span>Created: {fmt.format(new Date(r.date_created))}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={statusVariant(r.status)} className="rounded-xl">
                        {r.status}
                      </Badge>

                      <div className="inline-flex items-center gap-1 text-xs text-foreground/70">
                        View <ArrowUpRight className="size-3" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>

              {idx !== reports.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
