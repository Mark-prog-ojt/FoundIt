"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ShieldCheck,
  Save,
  RotateCcw,
  Trash2,
  ClipboardCheck,
  AlertTriangle,
  ImagePlus,
  XCircle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

type Props = {
  foundId: number;
  status: string;
  storageLocation: string;
  image?: string | null; // optional to keep backward-compatible
  variant?: "full" | "compact";
  claimSummary?: { total: number; pending: number } | null;
};

function normStatus(s: string) {
  return String(s || "").toUpperCase();
}

export function FoundStaffActions({
  foundId,
  status,
  storageLocation,
  image,
  variant = "full",
  claimSummary,
}: Props) {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState<null | "RETURN" | "DELETE">(null);
  const [loc, setLoc] = useState(storageLocation || "");

  const [imgBusy, setImgBusy] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(image ?? null);

  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setImgUrl(image ?? null);
  }, [image]);

  const s = useMemo(() => normStatus(status), [status]);
  const canReturn = s !== "RETURNED";
  const canDelete = s !== "CLAIMED"; // API will also enforce guardrails

  async function saveLocation() {
    const next = loc.trim();
    if (next.length < 2) {
      toast.error("Storage location is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/found/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ foundId, storageLocation: next }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to update storage location.");
        return;
      }

      toast.success("Storage location updated.");
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function act(mode: "RETURN" | "DELETE") {
    setActing(mode);
    try {
      const res = await fetch("/api/found/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ foundId, mode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Request failed.");
        return;
      }

      if (mode === "RETURN") toast.success("Marked as RETURNED.");
      if (mode === "DELETE") toast.success("Found item deleted.");

      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setActing(null);
    }
  }

  function pickFile() {
    fileRef.current?.click();
  }

  async function updateImage(next: string | null) {
    setImgBusy(true);
    try {
      const res = await fetch("/api/found/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ foundId, image: next }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to update image.");
        return false;
      }

      setImgUrl(next);
      router.refresh();
      return true;
    } catch {
      toast.error("Network error.");
      return false;
    } finally {
      setImgBusy(false);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (!f) return;

    if (!f.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const fd = new FormData();
    fd.append("file", f);

    setImgBusy(true);
    try {
      const res = await fetch("/api/uploads/found", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok || !data?.url) {
        toast.error(data?.error || "Upload failed.");
        return;
      }

      const url = String(data.url);
      const ok = await updateImage(url);
      if (ok) toast.success("Photo updated.");
    } catch {
      toast.error("Network error.");
    } finally {
      setImgBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    if (!imgUrl) return;

    const ok = window.confirm("Remove this photo? (This will set image = null.)");
    if (!ok) return;

    const did = await updateImage(null);
    if (did) toast.success("Photo removed.");
  }

  const previewSrc = imgUrl || "/found-placeholder.svg";
  const isCompact = variant === "compact";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="rounded-3xl border-0 bg-white/90 p-6 shadow-[0_12px_34px_rgba(0,0,0,0.05)] ring-1 ring-[rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F8F7F6] px-3 py-1 text-[11px] text-[#6B7280] ring-1 ring-black/5">
              <ShieldCheck className="size-3.5" />
              Staff actions
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="text-lg font-semibold tracking-tight">Manage found item</div>
              <Badge variant="secondary" className="rounded-xl">
                #{foundId}
              </Badge>
              <Badge variant="secondary" className="rounded-xl">
                {s}
              </Badge>
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
              Update photo + storage location, mark return, or delete (guarded).
            </div>

            {claimSummary ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-[#F8F7F6] px-3 py-1 ring-1 ring-black/5">
                  {claimSummary.pending} pending
                </span>
                <span className="rounded-full bg-[#F8F7F6] px-3 py-1 ring-1 ring-black/5">
                  {claimSummary.total} total claims
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <Separator className="my-5" />

        {/* Item photo */}
        <div>
          <div className="text-sm font-medium">Item photo</div>

          {isCompact ? (
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative h-24 w-32 overflow-hidden rounded-2xl bg-[#F8F7F6] ring-1 ring-black/5">
                <Image
                  src={previewSrc}
                  alt="Item photo"
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 240px"
                />
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={pickFile}
                    disabled={imgBusy || saving || acting !== null}
                  >
                    <ImagePlus className="mr-2 size-4" />
                    {imgUrl ? (imgBusy ? "Working..." : "Replace photo") : (imgBusy ? "Working..." : "Upload photo")}
                  </Button>

                  {imgUrl ? (
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={removePhoto}
                      disabled={imgBusy || saving || acting !== null}
                    >
                      <XCircle className="mr-2 size-4" />
                      {imgBusy ? "Working..." : "Remove photo"}
                    </Button>
                  ) : null}
                </div>

                <div className="text-xs text-muted-foreground">
                  Uploads go to <span className="font-medium text-foreground">/uploads/found/…</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
              <div className="relative aspect-[16/10] overflow-hidden rounded-3xl border-0 bg-[#F8F7F6] ring-1 ring-black/5">
                <Image src={previewSrc} alt="Item photo" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" />
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />

                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={pickFile}
                  disabled={imgBusy || saving || acting !== null}
                >
                  <ImagePlus className="mr-2 size-4" />
                  {imgUrl ? (imgBusy ? "Working..." : "Replace photo") : (imgBusy ? "Working..." : "Upload photo")}
                </Button>

                {imgUrl ? (
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={removePhoto}
                    disabled={imgBusy || saving || acting !== null}
                  >
                    <XCircle className="mr-2 size-4" />
                    {imgBusy ? "Working..." : "Remove photo"}
                  </Button>
                ) : null}

                <div className="text-xs text-muted-foreground">
                  Uploads go to <span className="font-medium text-foreground">/uploads/found/…</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-5" />

        {/* Storage location */}
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="text-sm font-medium">Storage location</div>
            <div className="mt-2">
              <Input
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder="e.g., Security Office – Drawer A"
                className="rounded-2xl"
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              This is what staff will use to physically retrieve the item.
            </div>
          </div>

          <Button className="rounded-2xl" onClick={saveLocation} disabled={saving || imgBusy || acting !== null}>
            <Save className="mr-2 size-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        <Separator className="my-5" />

        {/* Return / Delete */}
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="rounded-3xl border-0 bg-white/70 p-4 shadow-[0_6px_16px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Mark as returned</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Sets status to <span className="font-medium text-foreground">RETURNED</span>. Cleans up pending claims.
                </div>
              </div>
              <RotateCcw className="size-5 text-muted-foreground" />
            </div>

            <Button
              variant="outline"
              className="mt-4 w-full rounded-2xl"
              disabled={!canReturn || acting !== null || imgBusy}
              onClick={() => act("RETURN")}
            >
              <ClipboardCheck className="mr-2 size-4" />
              {acting === "RETURN" ? "Working..." : "Return"}
            </Button>
          </Card>

          <Card className="rounded-3xl border-0 bg-white/70 p-4 shadow-[0_6px_16px_rgba(0,0,0,0.04)] ring-1 ring-black/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Delete item</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Permanently removes this found item if it has no claims.
                </div>
              </div>
              <AlertTriangle className="size-5 text-muted-foreground" />
            </div>

            <Button
              variant="destructive"
              className="mt-4 w-full rounded-2xl"
              disabled={!canDelete || acting !== null || imgBusy}
              onClick={() => {
                const ok = window.confirm(
                  "Delete this found item? This cannot be undone. (If it has claims, the server will block it.)"
                );
                if (ok) act("DELETE");
              }}
            >
              <Trash2 className="mr-2 size-4" />
              {acting === "DELETE" ? "Working..." : "Delete"}
            </Button>

            {!canDelete ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Disabled because this item is already CLAIMED.
              </div>
            ) : null}
          </Card>
        </div>
      </Card>
    </motion.div>
  );
}
