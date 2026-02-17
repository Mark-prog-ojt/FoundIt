"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ClaimActions } from "@/components/staff/claim-actions";

type PendingClaim = {
  claim_id: number;
  date_claimed: string; // ISO string
  proof_description: string;
  claimant: { user_id: number; full_name: string; email: string };
  found_item: {
    found_id: number;
    item_name: string;
    status: string;
    date_found: string; // ISO string
    category: { category_name: string };
    location: { location_name: string };
  };
};

export default function StaffClaimsList({ pending }: { pending: PendingClaim[] }) {
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

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/20 p-6">
        <div className="font-medium">All caught up 🎉</div>
        <div className="mt-1 text-sm text-muted-foreground">
          There are no pending claims right now.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden">
      {pending.map((c, idx) => (
        <div key={c.claim_id}>
          <div className="p-4 transition hover:bg-accent/40">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-[260px]">
                <div className="font-semibold">
                  {c.found_item.item_name}{" "}
                  <span className="text-sm text-muted-foreground">
                    • {c.found_item.category.category_name} • {c.found_item.location.location_name}
                  </span>
                </div>

                <div className="mt-2 text-sm text-muted-foreground">
                  Claimant:{" "}
                  <span className="font-medium text-foreground">{c.claimant.full_name}</span>{" "}
                  <span className="text-muted-foreground">({c.claimant.email})</span>
                </div>

                <div className="mt-2 text-sm text-muted-foreground">
                  Proof: <span className="text-foreground/80">{c.proof_description}</span>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  Submitted: {fmt.format(new Date(c.date_claimed))} • Found:{" "}
                  {fmt.format(new Date(c.found_item.date_found))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" className="rounded-xl" asChild>
                  <Link href={`/found/${c.found_item.found_id}`}>View item</Link>
                </Button>

                <ClaimActions claimId={c.claim_id} onDone={() => router.refresh()} />
              </div>
            </div>
          </div>

          {idx !== pending.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
