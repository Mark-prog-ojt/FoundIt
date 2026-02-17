"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function WithdrawButton({
  lostId,
  disabled,
}: {
  lostId: number;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function withdraw() {
    setLoading(true);
    try {
      const res = await fetch("/api/lost/withdraw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lostId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Withdraw failed.");
        return;
      }

      toast.success("Report withdrawn.");
      window.location.reload();
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="rounded-xl"
          disabled={disabled || loading}
        >
          <TriangleAlert className="mr-2 size-4" />
          Withdraw report
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw this report?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the report as <span className="font-medium">CANCELLED</span>.
            Staff will stop matching it against found items.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">No, keep it</AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl"
            onClick={withdraw}
            disabled={loading}
          >
            {loading ? "Withdrawing..." : "Yes, withdraw"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
