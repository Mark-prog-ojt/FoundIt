from pathlib import Path
import re
from datetime import datetime

path = Path("src/app/found/page.tsx")
s = path.read_text(encoding="utf-8")

# Find the filter Card start (your current exact class string)
needle = '<Card className="rounded-3xl border border-black/5 bg-secondary/70 p-0 py-0 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">'
start = s.find(needle)

# Fallback if the class string changed slightly
if start == -1:
    m = re.search(r'<Card className="[^"]*bg-secondary/70[^"]*shadow-\[0_8px_30px_rgba\(0,0,0,0\.06\)\][^"]*">', s)
    if not m:
        raise SystemExit("ERROR: Filter Card start not found in src/app/found/page.tsx")
    start = m.start()

end = s.find("</Card>", start)
if end == -1:
    raise SystemExit("ERROR: Closing </Card> not found after filter Card start")
end += len("</Card>")

# Preserve indentation of the original <Card ...>
line_start = s.rfind("\n", 0, start) + 1
indent = re.match(r"[ \t]*", s[line_start:start]).group(0)

new_block = """<Card className="rounded-3xl border border-black/5 bg-secondary/70 p-0 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
  <div className="p-4 md:p-5">
    <form onSubmit={onSearchSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 rounded-2xl pl-9 border-0 bg-background/60 shadow-none ring-0 transition-colors placeholder:text-muted-foreground/80 hover:bg-background/75 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:bg-background/90"
            placeholder="Search keywords (e.g., wallet, ID, earbuds)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Button
          type="submit"
          className="h-11 rounded-2xl px-5 shadow-sm transition active:scale-[0.98]"
          disabled={loading}
        >
          Apply
        </Button>
      </div>

      <div className="rounded-2xl bg-background/45 p-3 ring-1 ring-black/5">
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <SlidersHorizontal className="size-4" />
          <span className="tracking-wide">FILTERS</span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <Select value={categoryId} onValueChange={(v) => setCategoryId(v)} disabled={optionsLoading}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus:ring-2 focus:ring-ring/25">
              <SelectValue placeholder={optionsLoading ? "Loading..." : "Category"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.category_id} value={String(c.category_id)}>
                  {c.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationId} onValueChange={(v) => setLocationId(v)} disabled={optionsLoading}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus:ring-2 focus:ring-ring/25">
              <SelectValue placeholder={optionsLoading ? "Loading..." : "Location"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.location_id} value={String(l.location_id)}>
                  {l.location_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus:ring-2 focus:ring-ring/25">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              className="h-11 rounded-2xl pl-9 border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:bg-background/90"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Date from"
            />
          </div>

          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              className="h-11 rounded-2xl pl-9 border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:bg-background/90"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Date to"
            />
          </div>

          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-11 w-full rounded-2xl border-0 bg-background/60 shadow-none ring-0 transition-colors hover:bg-background/75 focus:ring-2 focus:ring-ring/25">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </form>
  </div>
</Card>"""

# Re-indent the replacement to match the file
new_block_indented = "\n".join(
    (indent + line) if line.strip() else line
    for line in new_block.splitlines()
)

backup = Path(str(path) + ".bak." + datetime.now().strftime("%Y%m%d_%H%M%S"))
backup.write_text(s, encoding="utf-8")

out = s[:start] + new_block_indented + s[end:]
path.write_text(out, encoding="utf-8")

print("OK: updated", path)
print("OK: backup saved at", backup)
