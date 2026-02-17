import re
from datetime import datetime
from pathlib import Path
import sys

FILE = Path("src/app/found/page.tsx")

NEW_CARD = """          <Card className="rounded-3xl border border-black/5 bg-secondary/70 p-0 py-0 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="p-4 md:p-5">
              <form onSubmit={onSearchSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="h-10 rounded-2xl pl-9 border-transparent bg-background/70 shadow-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-ring/20"
                      placeholder="Search keywords (e.g., wallet, ID, earbuds)..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="h-10 rounded-2xl px-5 shadow-sm" disabled={loading}>
                    Apply
                  </Button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <SlidersHorizontal className="size-4" />
                    <span className="tracking-wide">FILTERS</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <Select
                      value={categoryId}
                      onValueChange={(v) => setCategoryId(v)}
                      disabled={optionsLoading}
                    >
                      <SelectTrigger className="h-10 w-full rounded-2xl border-transparent bg-background/70 shadow-none ring-1 ring-black/5">
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

                    <Select
                      value={locationId}
                      onValueChange={(v) => setLocationId(v)}
                      disabled={optionsLoading}
                    >
                      <SelectTrigger className="h-10 w-full rounded-2xl border-transparent bg-background/70 shadow-none ring-1 ring-black/5">
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
                      <SelectTrigger className="h-10 w-full rounded-2xl border-transparent bg-background/70 shadow-none ring-1 ring-black/5">
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
                        className="h-10 rounded-2xl pl-9 border-transparent bg-background/70 shadow-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-ring/20"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        aria-label="Date from"
                      />
                    </div>

                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="date"
                        className="h-10 rounded-2xl pl-9 border-transparent bg-background/70 shadow-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-ring/20"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        aria-label="Date to"
                      />
                    </div>

                    <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                      <SelectTrigger className="h-10 w-full rounded-2xl border-transparent bg-background/70 shadow-none ring-1 ring-black/5">
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
          </Card>
"""

def main():
    check = "--check" in sys.argv

    if not FILE.exists():
        print(f"ERROR: not found: {FILE}")
        sys.exit(1)

    txt = FILE.read_text(encoding="utf-8")

    start = '<Card className="rounded-3xl p-5">'
    si = txt.find(start)
    if si == -1:
        print("ERROR: Could not find the exact start marker:")
        print(start)
        sys.exit(2)

    ei = txt.find("</Card>", si)
    if ei == -1:
        print("ERROR: Found start marker but could not find closing </Card> after it.")
        sys.exit(3)

    old_block = txt[si:ei + len("</Card>")]

    if check:
        print("OK: Found filter Card block.")
        print(f"Start index: {si}, End index: {ei + len('</Card>')}")
        print("Old block first line:", old_block.splitlines()[0])
        print("Old block last line:", old_block.splitlines()[-1])
        sys.exit(0)

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = FILE.with_suffix(FILE.suffix + f".bak.{stamp}")
    backup.write_text(txt, encoding="utf-8")

    next_txt = txt[:si] + NEW_CARD + txt[ei + len("</Card>"):]
    FILE.write_text(next_txt, encoding="utf-8")

    print("DONE: Patched filter Card block.")
    print(f"Backup: {backup}")

if __name__ == "__main__":
    main()
