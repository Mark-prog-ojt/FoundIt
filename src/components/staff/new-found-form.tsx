"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Category = { category_id: number; category_name: string };
type Location = { location_id: number; location_name: string };

export function NewFoundForm() {
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [categoryId, setCategoryId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [dateFound, setDateFound] = useState(""); // YYYY-MM-DD
  const [image, setImage] = useState(""); // url optional

  const canSubmit = useMemo(() => {
    if (!categoryId || !locationId) return false;
    if (itemName.trim().length < 2) return false;
    if (description.trim().length < 5) return false;
    if (storageLocation.trim().length < 2) return false;
    return true;
  }, [categoryId, locationId, itemName, description, storageLocation]);

  async function loadOptions() {
    setLoadingOptions(true);
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
      setLoadingOptions(false);
    }
  }

  useEffect(() => {
    loadOptions();
  }, []);

  async function submit() {
    if (!canSubmit) {
      toast.error("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        categoryId: Number(categoryId),
        locationId: Number(locationId),
        itemName: itemName.trim(),
        description: description.trim(),
        storageLocation: storageLocation.trim(),
        dateFound: dateFound ? dateFound : undefined,
        image: image.trim() ? image.trim() : null,
      };

      const res = await fetch("/api/found/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        toast.error(data?.error || "Failed to create found item.");
        return;
      }

      toast.success("Found item created.");
      const id = data?.found?.found_id;
      if (id) window.location.href = `/found/${id}`;
      else window.location.href = "/found";
    } catch {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Staff only</div>
          <h1 className="text-2xl font-semibold tracking-tight">Add found item</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            Post an item turned in to the office. Users can then file claims.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-xl">NEW</Badge>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/found">Back to found list</Link>
          </Button>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Category *</div>
          <Select value={categoryId} onValueChange={setCategoryId} disabled={loadingOptions}>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder={loadingOptions ? "Loading..." : "Select category"} />
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

        <div>
          <div className="text-xs text-muted-foreground">Location *</div>
          <Select value={locationId} onValueChange={setLocationId} disabled={loadingOptions}>
            <SelectTrigger className="mt-1 rounded-xl">
              <SelectValue placeholder={loadingOptions ? "Loading..." : "Select location"} />
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

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">Item name *</div>
          <Input
            className="mt-1 rounded-xl"
            placeholder='e.g., "Black Wallet", "AirPods Case", "ID Card"'
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">Description *</div>
          <textarea
            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={4}
            placeholder="Describe identifiable details (brand, color, contents, markings, etc.)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground">Storage location *</div>
          <Input
            className="mt-1 rounded-xl"
            placeholder='e.g., "Office cabinet A", "Drawer 2", "Locker #5"'
            value={storageLocation}
            onChange={(e) => setStorageLocation(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Date found (optional)</div>
          <Input
            className="mt-1 rounded-xl"
            type="date"
            value={dateFound}
            onChange={(e) => setDateFound(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Image URL (optional)</div>
          <Input
            className="mt-1 rounded-xl"
            placeholder="https://..."
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button className="rounded-xl" onClick={submit} disabled={!canSubmit || submitting}>
          {submitting ? "Creating..." : "Create found item"}
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={loadOptions} disabled={loadingOptions}>
          Reload options
        </Button>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Tip: include specific keywords — it improves suggested match scoring.
      </div>
    </Card>
  );
}
