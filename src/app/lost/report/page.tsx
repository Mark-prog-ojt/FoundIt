"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { AppShell } from "@/components/site/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, ArrowLeft, ClipboardPenLine } from "lucide-react";

type Category = { category_id: number; category_name: string };
type Location = { location_id: number; location_name: string };

export default function ReportLostPage() {
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Form state
  const [categoryId, setCategoryId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [dateLost, setDateLost] = useState("");
  const [lastSeenLocation, setLastSeenLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const canSubmit = useMemo(() => {
    return (
      categoryId &&
      locationId &&
      itemName.trim().length >= 2 &&
      description.trim().length >= 10 &&
      dateLost &&
      lastSeenLocation.trim().length >= 2
    );
  }, [categoryId, locationId, itemName, description, dateLost, lastSeenLocation]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/meta/options", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;

        if (!res.ok || !data?.ok) {
          toast.error("Failed to load options.");
          setOptionsLoading(false);
          return;
        }

        setCategories(data.categories || []);
        setLocations(data.locations || []);
      } catch {
        toast.error("Failed to load options.");
      } finally {
        if (alive) setOptionsLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function uploadSelected(): Promise<string | null> {
    if (!imageFile) return null;

    try {
      const fd = new FormData();
      fd.append("file", imageFile);

      const res = await fetch("/api/uploads/lost", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || typeof data?.url !== "string") {
        toast.error(data?.error || "Upload failed.");
        return null;
      }

      setImageUrl(data.url);
      return data.url as string;
    } catch {
      toast.error("Upload failed.");
      return null;
    }
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview("");
    setImageUrl("");
    setFileInputKey((k) => k + 1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      let finalImageUrl = imageUrl.trim();
      if (imageFile && !finalImageUrl) {
        const uploaded = await uploadSelected();
        if (!uploaded) return;
        finalImageUrl = uploaded.trim();
      }

      const res = await fetch("/api/lost/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categoryId: Number(categoryId),
          locationId: Number(locationId),
          itemName,
          description,
          dateLost,
          lastSeenLocation,
          image: finalImageUrl ? finalImageUrl : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "Failed to submit report.");
        return;
      }

      toast.success("Lost item report submitted!");
      window.location.href = "/dashboard";
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl border bg-muted/20">
              <ClipboardPenLine className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Report Lost Item</h1>
              <p className="text-sm text-muted-foreground">
                Provide accurate details to improve matching and recovery.
              </p>
            </div>
          </div>

          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 size-4" />
              Back to dashboard
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <Card className="rounded-3xl p-6">
            <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={optionsLoading}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={optionsLoading ? "Loading..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.category_id} value={String(c.category_id)}>
                        {c.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location (where it was lost)</Label>
                <Select
                  value={locationId}
                  onValueChange={setLocationId}
                  disabled={optionsLoading}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={optionsLoading ? "Loading..." : "Select location"} />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => (
                      <SelectItem key={l.location_id} value={String(l.location_id)}>
                        {l.location_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemName">Item name</Label>
                <Input
                  id="itemName"
                  className="rounded-xl"
                  placeholder="e.g., Black wallet, AirPods, ID lace"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateLost">Date lost</Label>
                <Input
                  id="dateLost"
                  type="date"
                  className="rounded-xl"
                  value={dateLost}
                  onChange={(e) => setDateLost(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="lastSeenLocation">Last seen details</Label>
                <Input
                  id="lastSeenLocation"
                  className="rounded-xl"
                  placeholder="e.g., Near Library entrance, 2nd floor hallway"
                  value={lastSeenLocation}
                  onChange={(e) => setLastSeenLocation(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="rounded-xl min-h-[120px]"
                  placeholder="Describe identifying details: color, brand, contents, marks, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <div className="text-xs text-muted-foreground">
                  Tip: include brand/model/serial/unique marks to improve matching.
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="image">Photo (optional)</Label>
                <Input
                  key={fileInputKey}
                  id="image"
                  type="file"
                  accept="image/*"
                  className="rounded-xl"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (!f) {
                      setImageFile(null);
                      setImagePreview("");
                      setImageUrl("");
                      return;
                    }
                    if (!f.type.startsWith("image/")) {
                      toast.error("Please select an image file.");
                      e.target.value = "";
                      return;
                    }
                    if (f.size > 5 * 1024 * 1024) {
                      toast.error("Image too large (max 5MB).");
                      e.target.value = "";
                      return;
                    }
                    setImageFile(f);
                    setImageUrl("");
                  }}
                />
                <div className="text-xs text-muted-foreground">JPG/PNG/WEBP/GIF up to 5MB.</div>
                {imagePreview ? (
                  <div className="overflow-hidden rounded-xl border bg-background/60">
                    <img
                      src={imagePreview}
                      alt="Selected item photo preview"
                      className="h-48 w-full object-contain"
                    />
                  </div>
                ) : null}
                {imageFile || imageUrl ? (
                  <Button type="button" variant="outline" className="rounded-xl" onClick={clearImage}>
                    Remove photo
                  </Button>
                ) : null}
              </div>

              <div className="md:col-span-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Status will be set to <span className="font-medium text-foreground">REPORTED_LOST</span>.
                </div>

                <Button
                  type="submit"
                  className="rounded-xl transition hover:-translate-y-0.5"
                  disabled={!canSubmit || loading}
                >
                  {loading ? "Submitting..." : "Submit report"}
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </AppShell>
  );
}
