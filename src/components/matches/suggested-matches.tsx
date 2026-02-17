"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState, LoadingGrid } from "@/components/ui/empty-state";
import { Sparkles, MapPin, Tag, RefreshCw } from "lucide-react";

type MatchRow = {
  found_id: number;
  item_name: string;
  status: string;
  date_found: string;
  image: string | null;
  category: { category_name: string };
  location: { location_name: string };
  score: number;
  reasons: string[];
};

function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
  if (score >= 60) return "bg-sky-500/10 text-sky-700 border-sky-500/20";
  return "bg-muted/70 text-muted-foreground border-border/60";
}

export function SuggestedMatches({ lostId }: { lostId: number }) {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchRow[]>([]);

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
      const res = await fetch(`/api/matches/suggest?lostId=${lostId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load suggested matches.");
        setMatches([]);
        return;
      }

      setMatches(data.matches || []);
    } catch {
      toast.error("Failed to load suggested matches.");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lostId]);

  return (
    <Card className="rounded-3xl p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-2xl border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            Matching engine
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Suggested matches</h2>
            <Badge variant="secondary" className="rounded-xl">
              Top {Math.min(10, matches.length || 0)}
            </Badge>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Ranked using category, location, date proximity, and keyword overlap.
          </p>
        </div>

        <Button
          variant="outline"
          className="rounded-xl"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      <Separator className="my-4" />

      {loading ? (
        <LoadingGrid count={3} variant="media" className="md:grid-cols-2 xl:grid-cols-3" />
      ) : matches.length === 0 ? (
        <EmptyState
          title="No strong matches yet"
          description="Add more details to the lost report description, or browse the found list."
          icon={<Sparkles className="size-5" />}
          actions={
            <Button className="rounded-xl" asChild>
              <Link href="/found">Browse found items</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((m, idx) => {
            const claimable = String(m.status).toUpperCase() === "NEWLY_FOUND";
            const img = m.image || "/found-placeholder.svg";

            return (
              <motion.div
                key={m.found_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
              >
                <Card className="group overflow-hidden rounded-3xl transition hover:-translate-y-0.5 hover:bg-accent/40 hover:shadow-sm">
                  <Link href={`/found/${m.found_id}`} className="block">
                    <div className="relative aspect-[16/9]">
                      <Image
                        src={img}
                        alt={m.item_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />

                      <div className="absolute left-4 top-4 flex items-center gap-2">
                        <div
                          className={
                            "rounded-xl border px-2.5 py-1 text-xs font-medium backdrop-blur " +
                            scoreTone(m.score)
                          }
                        >
                          {m.score}% match
                        </div>
                        <Badge variant="secondary" className="rounded-xl bg-background/70 backdrop-blur">
                          {m.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold leading-tight">
                          {m.item_name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Tag className="size-3" /> {m.category.category_name}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" /> {m.location.location_name}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Found: {fmt.format(new Date(m.date_found))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.reasons.slice(0, 3).map((r) => (
                        <span
                          key={r}
                          className="rounded-xl border bg-background/50 px-2 py-1 text-xs text-muted-foreground"
                        >
                          {r}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button className="rounded-xl" variant="outline" asChild>
                        <Link href={`/found/${m.found_id}`}>View</Link>
                      </Button>
                      {claimable ? (
                        <Button className="rounded-xl" asChild>
                          <Link href={`/claims/new?foundId=${m.found_id}`}>
                            Start claim
                          </Link>
                        </Button>
                      ) : (
                        <Button className="rounded-xl" disabled>
                          Already claimed
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
