"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export function ClaimActions({
  claimId,
  onDone,
}: {
  claimId: number;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState<"APPROVE" | "DENY" | null>(null);

  async function decide(decision: "APPROVE" | "DENY") {
    setLoading(decision);
    try {
      const res = await fetch("/api/claims/decision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claimId, decision }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Action failed.");
        return;
      }

      toast.success(decision === "APPROVE" ? "Claim approved." : "Claim denied.");
      onDone();
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="rounded-xl bg-emerald-600 text-white shadow-[0_10px_24px_rgba(16,185,129,0.25)] hover:-translate-y-0.5 hover:bg-emerald-600/90 hover:shadow-[0_14px_32px_rgba(16,185,129,0.3)] active:translate-y-0 active:scale-[0.98] focus-visible:ring-emerald-500/30"
            disabled={!!loading}
          >
            {loading === "APPROVE" ? "Approving..." : "Approve"}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the found item as <b>CLAIMED</b> and deny other pending claims for the same item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-emerald-600 text-white shadow-[0_10px_24px_rgba(16,185,129,0.25)] hover:-translate-y-0.5 hover:bg-emerald-600/90 hover:shadow-[0_14px_32px_rgba(16,185,129,0.3)] active:translate-y-0 active:scale-[0.98] focus-visible:ring-emerald-500/30"
              onClick={() => decide("APPROVE")}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="rounded-xl" disabled={!!loading}>
            {loading === "DENY" ? "Denying..." : "Deny"}
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Deny this claim?</AlertDialogTitle>
            <AlertDialogDescription>
              The claimant will see this claim as <b>DENIED</b> in their dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl"
              onClick={() => decide("DENY")}
            >
              Deny
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
