from pathlib import Path
import re
from datetime import datetime

path = Path("src/app/found/page.tsx")
s = path.read_text(encoding="utf-8")

pattern = re.compile(
    r'(?P<indent>[ \t]*)\{items\.map\(\(it\)\s*=>\s*\{\s*\n'
    r'(?:(?:.|\n)*?)'
    r'const\s+src\s*=\s*it\.image\s*\|\|\s*"/found-placeholder\.svg";\s*\n'
    r'(?:(?:.|\n)*?)'
    r'const\s+statusLabel\s*=\s*statusOptions\.find\(\(o\)\s*=>\s*o\.value\s*===\s*it\.status\)\?\.\s*label\s*\?\?\s*it\.status;\s*\n'
    r'(?:(?:.|\n)*?)'
    r'const\s+hasImg\s*=\s*Boolean\(it\.image\);\s*\n'
    r'(?:(?:.|\n)*?)'
    r'\}\)\}\s*',
    re.MULTILINE
)

m = pattern.search(s)
if not m:
    raise SystemExit('ERROR: items.map block (with src/statusLabel/hasImg) not found. Paste the current items.map section again.')

indent = m.group("indent")

new_block = """{items.map((it) => {
  const src = it.image || "/found-placeholder.svg";
  const statusLabel = statusOptions.find((o) => o.value === it.status)?.label ?? it.status;
  const hasImg = Boolean(it.image);

  const statusKey = String(it.status || "").toUpperCase();
  const tone =
    statusKey === "NEWLY_FOUND"
      ? "bg-emerald-500/15 text-emerald-800 ring-emerald-500/20"
      : statusKey === "CLAIMED"
      ? "bg-zinc-500/15 text-zinc-800 ring-zinc-500/15"
      : "bg-blue-500/15 text-blue-800 ring-blue-500/20";

  return (
    <Link key={it.found_id} href={`/found/${it.found_id}`} className="group block">
      <Card className="rounded-3xl overflow-hidden p-0 bg-card ring-1 ring-black/5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition will-change-transform group-hover:-translate-y-1 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary/70">
          <div className="absolute inset-4">
            <Image
              src={src}
              alt={it.item_name}
              fill
              className="object-contain transition duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 1024px) 100vw, 33vw"
              priority={false}
            />
          </div>

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

new_block_indented = "\n".join((indent + line) if line.strip() else line for line in new_block.splitlines())

backup = Path(str(path) + ".bak." + datetime.now().strftime("%Y%m%d_%H%M%S"))
backup.write_text(s, encoding="utf-8")

out = s[:m.start()] + new_block_indented + s[m.end():]
path.write_text(out, encoding="utf-8")

print("OK: updated", path)
print("OK: backup saved at", backup)
