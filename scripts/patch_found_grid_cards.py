from pathlib import Path
import re
from datetime import datetime

path = Path("src/app/found/page.tsx")
s = path.read_text(encoding="utf-8")

# Replace ONLY the {items.map(...)} block inside the grid wrapper
pattern = re.compile(
    r'(<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">\n)'
    r'(\s*\{items\.map\(\(it\) => \{\n(?:.|\n)*?\n\s*\}\)\}\n)'
    r'(\s*</div>)',
    re.MULTILINE
)

m = pattern.search(s)
if not m:
    raise SystemExit("ERROR: grid cards block not found. Paste the current grid wrapper + items.map block again.")

before_map = m.group(2)

new_map = """            {items.map((it) => {
              const src = it.image || "/found-placeholder.svg";
              const statusLabel =
                statusOptions.find((o) => o.value === it.status)?.label ?? it.status;

              const statusKey = String(it.status || "").toUpperCase();
              const tone =
                statusKey === "NEWLY_FOUND"
                  ? "bg-emerald-500/15 text-emerald-700 ring-emerald-500/20"
                  : statusKey === "CLAIMED"
                  ? "bg-zinc-500/15 text-zinc-700 ring-zinc-500/15"
                  : "bg-blue-500/15 text-blue-700 ring-blue-500/20";

              return (
                <Link key={it.found_id} href={`/found/${it.found_id}`} className="group block">
                  <Card className="rounded-3xl overflow-hidden p-0 ring-1 ring-black/5 bg-card shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition will-change-transform group-hover:-translate-y-1 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary/60">
                      <Image
                        src={src}
                        alt={it.item_name}
                        fill
                        className="object-cover object-[center_35%] transition duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        priority={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0 opacity-90" />

                      <div className="absolute left-3 top-3">
                        <Badge
                          variant="secondary"
                          className={"rounded-full border-0 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur ring-1 ring-black/10 " + tone}
                        >
                          {statusLabel}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold tracking-tight truncate underline-offset-4 group-hover:underline">
                          {it.item_name}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground/80">
                          <span className="inline-flex items-center gap-1">
                            <Tag className="size-3" />
                            {it.category.category_name}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" />
                            {it.location.location_name}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground/85 line-clamp-2">
                        {it.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between text-[12px] text-muted-foreground/80">
                        <span>Found: {fmt.format(new Date(it.date_found))}</span>
                        <span className="text-primary/80 group-hover:text-primary">View</span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}"""

# keep original indentation
indent_match = re.match(r"\s*", before_map)
indent = indent_match.group(0) if indent_match else ""
new_map_indented = "\n".join((indent + line) if line.strip() else line for line in new_map.splitlines())

backup = Path(str(path) + ".bak." + datetime.now().strftime("%Y%m%d_%H%M%S"))
backup.write_text(s, encoding="utf-8")

out = s[:m.start(2)] + new_map_indented + s[m.end(2):]
path.write_text(out, encoding="utf-8")

print("OK: updated", path)
print("OK: backup saved at", backup)
