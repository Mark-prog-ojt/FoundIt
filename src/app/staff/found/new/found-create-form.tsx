"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { category_id: number; category_name: string };
type Location = { location_id: number; location_name: string };

export function FoundCreateForm() {
  const router = useRouter();

  const [optionsLoading, setOptionsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [saving, setSaving] = useState(false);

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [dateFound, setDateFound] = useState<string>("");
  const [storageLocation, setStorageLocation] = useState("");

  // Image handling
  const [imageUrl, setImageUrl] = useState(""); // will store returned "/uploads/found/..."
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(""); // local blob preview
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function loadOptions() {
    setOptionsLoading(true);
    try {
      const res = await fetch("/api/meta/options", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to load options.");
        return;
      }
      setCategories(data.categories || []);
      setLocations(data.locations || []);
    } catch {
      toast.error("Failed to load options.");
    } finally {
      setOptionsLoading(false);
    }
  }

  useEffect(() => {
    loadOptions();
  }, []);

  function validate() {
    if (!itemName.trim()) return "Item name is required.";
    if (!description.trim()) return "Description is required.";
    if (!categoryId) return "Category is required.";
    if (!locationId) return "Location is required.";
    if (!dateFound) return "Date found is required.";
    if (!storageLocation.trim()) return "Storage location is required.";
    return null;
  }

  async function uploadSelected(): Promise<string | null> {
    if (!imageFile) {
      toast.error("Please choose an image file first.");
      return null;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);

      const res = await fetch("/api/uploads/found", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok || typeof data?.url !== "string") {
        toast.error(data?.error || "Upload failed.");
        return null;
      }

      setImageUrl(data.url); // e.g. "/uploads/found/xxxx.jpg"
      toast.success("Photo uploaded.");
      return data.url as string;
    } catch {
      toast.error("Upload failed.");
      return null;
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview("");
    setImageUrl("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }

    // If a file is selected but not uploaded yet, upload it first.
    let finalImageUrl = imageUrl.trim();
    if (imageFile && !finalImageUrl) {
      const uploaded = await uploadSelected();
      if (!uploaded) return;
      finalImageUrl = uploaded.trim();
    }

    setSaving(true);
    try {
      const res = await fetch("/api/found/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          itemName: itemName.trim(),
          description: description.trim(),
          categoryId: Number(categoryId),
          locationId: Number(locationId),
          dateFound: dateFound, // "YYYY-MM-DD"
          storageLocation: storageLocation.trim(),
          image: finalImageUrl ? finalImageUrl : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Create failed.");
        return;
      }

      toast.success("Found item created.");

      const id =
        Number(data?.found?.found_id) ||
        Number(data?.foundId) ||
        Number(data?.found_id) ||
        Number(data?.item?.found_id) ||
        null;

      if (id) router.push(`/found/${id}`);
      else router.push("/staff/dashboard");

      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  const previewSrc = imagePreview || imageUrl || "/found-placeholder.svg";
  const hasPreview = Boolean(imagePreview || imageUrl);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B7280]">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#F8F7F6] px-3 py-1 ring-1 ring-black/5">
          Fields marked <span className="font-semibold text-[#111827]">required</span> must be filled.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em]">
            /api/found/create
          </Badge>
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em]">
            {optionsLoading ? "Loading filters…" : "Ready"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
        <Card className="rounded-3xl border-0 bg-white/92 p-6 shadow-[0_12px_34px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
          <div>
            <div className="text-sm font-semibold tracking-tight">Item details</div>
            <div className="mt-1 text-sm text-[#6B7280]">
              Capture what was found and where it’s stored.
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between text-sm font-medium">
                Item name
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7F0101]">
                  Required
                </span>
              </div>
              <Input
                className="mt-2 rounded-2xl bg-white/80 ring-1 ring-black/5"
                placeholder='e.g., "Black Wallet"'
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-medium">
                Category
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7F0101]">Required</span>
              </div>
              <div className="mt-2">
                <Select value={categoryId} onValueChange={setCategoryId} disabled={optionsLoading}>
                  <SelectTrigger className="rounded-2xl bg-white/80 ring-1 ring-black/5">
                    <SelectValue placeholder={optionsLoading ? "Loading…" : "Select category"} />
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
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-medium">
                Location
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7F0101]">Required</span>
              </div>
              <div className="mt-2">
                <Select value={locationId} onValueChange={setLocationId} disabled={optionsLoading}>
                  <SelectTrigger className="rounded-2xl bg-white/80 ring-1 ring-black/5">
                    <SelectValue placeholder={optionsLoading ? "Loading…" : "Select location"} />
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
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-medium">
                Date found
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7F0101]">Required</span>
              </div>
              <Input
                className="mt-2 rounded-2xl bg-white/80 ring-1 ring-black/5"
                type="date"
                value={dateFound}
                onChange={(e) => setDateFound(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-medium">
                Stored at
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7F0101]">Required</span>
              </div>
              <Input
                className="mt-2 rounded-2xl bg-white/80 ring-1 ring-black/5"
                placeholder='e.g., "Security Office - Cabinet A"'
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between text-sm font-medium">
                Description
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7F0101]">Required</span>
              </div>
              <Textarea
                className="mt-2 min-h-[150px] rounded-2xl bg-white/80 ring-1 ring-black/5"
                placeholder="Add identifying details…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <Card className="rounded-3xl border-0 bg-white/92 p-6 shadow-[0_12px_34px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold tracking-tight">Photo</div>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em]">
                Optional
              </Badge>
            </div>
            <p className="mt-1 text-sm text-[#6B7280]">
              Add a clear photo to increase claim confidence.
            </p>

            <div className="mt-4 rounded-2xl bg-[#F8F7F6] p-3 ring-1 ring-black/5">
              <div className="relative overflow-hidden rounded-2xl bg-white">
                <div className="aspect-[4/3]">
                  <Image
                    src={previewSrc}
                    alt="Preview"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 360px"
                    unoptimized={!imageUrl.trim()}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setImageFile(f);
                    if (f) setImageUrl("");
                  }}
                />

                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {imageFile ? "Replace file" : "Select photo"}
                </Button>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    disabled={!imageFile || uploading}
                    onClick={() => uploadSelected()}
                  >
                    {uploading ? "Uploading…" : "Upload now"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    disabled={(!imageFile && !imageUrl) || uploading}
                    onClick={clearImage}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-muted-foreground">
                Image URL (auto-filled after upload)
              </div>
              <Input
                className="mt-2 rounded-2xl bg-white/80 ring-1 ring-black/5"
                placeholder="https://… or /uploads/found/…"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            {hasPreview ? (
              <div className="mt-3 text-xs text-muted-foreground">
                Preview ready. You can upload now or submit to auto-upload.
              </div>
            ) : null}
          </Card>

          <Card className="rounded-3xl border-0 bg-white/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
            <div className="text-sm font-semibold">Before you submit</div>
            <div className="mt-2 text-sm text-[#6B7280]">
              Check that the category and location match where the item was found. Add unique details to help owners identify it.
            </div>
          </Card>
        </div>
      </div>

      <Card className="rounded-3xl border-0 bg-white/92 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-[rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Ready to publish?</div>
            <div className="text-sm text-[#6B7280]">You can edit this item later if needed.</div>
          </div>
          <Button type="submit" className="rounded-2xl px-6 shadow-[0_10px_26px_rgba(127,1,1,0.25)]" disabled={saving || uploading}>
            {saving ? "Creating…" : "Create found item"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
