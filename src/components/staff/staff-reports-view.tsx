"use client";

import Image from "next/image";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays, MapPin, Tag, FileText } from "lucide-react";

type ReportRow = {
  report_id: number;
  item_name: string;
  image: string | null;
  category_name: string;
  location_name: string;
  status: string;
  created_at: string;
};

function tone(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "CANCELLED") return "bg-rose-500/12 text-rose-700 ring-rose-500/20";
  if (s === "REPORTED_LOST") return "bg-[#7F0101]/12 text-[#7F0101] ring-[#7F0101]/20";
  return "bg-slate-500/10 text-slate-700 ring-slate-500/20";
}

export function StaffReportsView({
  items,
  role,
}: {
  items: ReportRow[];
  role?: string;
}) {
  const fmt = useMemo(
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

  return (
    <div className="flex flex-col gap-3">
      <Card className="rounded-3xl border-0 bg-white/92 p-6 shadow-[0_12px_34px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">Staff</div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <div className="mt-1 text-sm text-muted-foreground">
              View submitted lost reports (read-only list).
            </div>
          </div>
          {role ? (
            <Badge className="rounded-full px-3 py-1 text-[11px] font-medium">{role}</Badge>
          ) : null}
        </div>
      </Card>

      <Separator />

      {items.length === 0 ? (
        <EmptyState
          title="No reports found"
          description="Try again later."
          icon={<FileText className="size-5" />}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r, idx) => {
            const src = r.image || "/found-placeholder.svg";
            return (
              <motion.div
                key={r.report_id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.015 }}
              >
                <Card className="rounded-3xl border-0 bg-white/92 p-5 shadow-[0_8px_20px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)] transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                  <div className="relative overflow-hidden rounded-2xl bg-[#F8F7F6]">
                    <div className="aspect-[4/3]">
                      <Image
                        src={src}
                        alt={r.item_name}
                        fill
                        className="object-contain"
                        sizes="(max-width: 1024px) 100vw, 33vw"
                      />
                    </div>
                    <div className="absolute left-3 top-3 flex items-center gap-2">
                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 " +
                          tone(r.status)
                        }
                      >
                        {r.status}
                      </span>
                      <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-medium">
                        #{r.report_id}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-base font-semibold truncate">{r.item_name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#6B7280]">
                      <span className="inline-flex items-center gap-1">
                        <Tag className="size-3" />
                        {r.category_name}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {r.location_name}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-[#6B7280]">
                      <CalendarDays className="mr-1 inline-block size-3" />
                      {fmt.format(new Date(r.created_at))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
