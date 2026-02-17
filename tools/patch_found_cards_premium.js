/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "src/app/found/page.tsx");
let s = fs.readFileSync(file, "utf8");

// 1) Add helper functions near the top (after SORT_OPTIONS or before export default is fine)
if (!s.includes("function statusBadgeClass(")) {
  const anchor = "const SORT_OPTIONS";
  const idx = s.indexOf(anchor);
  if (idx === -1) {
    console.error("Patch failed: cannot find SORT_OPTIONS anchor.");
    process.exit(1);
  }

  const insertAt = s.indexOf("];", idx);
  if (insertAt === -1) {
    console.error("Patch failed: cannot find end of SORT_OPTIONS.");
    process.exit(1);
  }

  const helpers = `

function statusBadgeClass(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "NEWLY_FOUND") {
    return "border-transparent bg-[rgba(52,199,89,0.14)] text-[#1F7A3D]";
  }
  if (s === "CLAIMED") {
    return "border-transparent bg-[rgba(142,142,147,0.18)] text-[#3A3A3C]";
  }
  if (s === "RETURNED") {
    return "border-transparent bg-[rgba(10,132,255,0.14)] text-[#0A84FF]";
  }
  return "border-transparent bg-[rgba(142,142,147,0.18)] text-[#3A3A3C]";
}

function hasImage(src: string) {
  return !!src && src !== "/found-placeholder.svg";
}
`;
  s = s.slice(0, insertAt + 2) + helpers + s.slice(insertAt + 2);
}

// 2) Replace the card image block inside items.map to use:
// - media frame bg
// - blurred cover backdrop
// - contain foreground
// - premium badge
const oldNeedle = `const src = it.image || "/found-placeholder.svg";
              return (
                <Link key={it.found_id} href={\`/found/\${it.found_id}\`} className="group block">
                  <Card className="rounded-3xl overflow-hidden transition group-hover:-translate-y-1 group-hover:shadow-sm group-hover:bg-accent/40">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Image
                        src={src}
                        alt={it.item_name}
                        fill
                        className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 1024px) 100vw, 33vw"
                        priority={false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 opacity-90" />
                      <div className="absolute left-3 top-3">
                        <Badge variant="secondary" className="rounded-xl">
                          {it.status}
                        </Badge>
                      </div>
                    </div>`;

const newBlock = `const src = it.image || "/found-placeholder.svg";
              const real = hasImage(src);
              return (
                <Link key={it.found_id} href={\`/found/\${it.found_id}\`} className="group block">
                  <Card
                    className="rounded-3xl overflow-hidden border border-border bg-card p-0 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition will-change-transform group-hover:-translate-y-1 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                      {real ? (
                        <>
                          {/* blurred backdrop (fills, keeps feed premium even with white product photos) */}
                          <Image
                            src={src}
                            alt=""
                            fill
                            className="object-cover scale-[1.08] blur-2xl opacity-70"
                            sizes="(max-width: 1024px) 100vw, 33vw"
                            priority={false}
                          />
                          {/* main image (contain so skinny items don't look cropped) */}
                          <div className="absolute inset-0 p-4">
                            <div className="relative h-full w-full">
                              <Image
                                src={src}
                                alt={it.item_name}
                                fill
                                className="object-contain transition duration-300 group-hover:scale-[1.02]"
                                sizes="(max-width: 1024px) 100vw, 33vw"
                                priority={false}
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Image
                            src="/found-placeholder.svg"
                            alt={it.item_name}
                            width={120}
                            height={120}
                            className="opacity-60"
                          />
                        </div>
                      )}

                      {/* subtle scrim for badge legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-black/0" />

                      <div className="absolute left-3 top-3">
                        <Badge className={\`rounded-full px-2.5 py-1 text-xs \${statusBadgeClass(it.status)}\`}>
                          {it.status}
                        </Badge>
                      </div>
                    </div>`;

if (!s.includes(oldNeedle)) {
  console.error("Patch failed: couldn't locate the current card image block (items.map).");
  process.exit(1);
}
s = s.replace(oldNeedle, newBlock);

// 3) Reduce “enterprise borders” in filter card by making it a surfaceAlt (secondary) and softer border.
s = s.replace(
  /<Card className="rounded-3xl p-5">/g,
  `<Card className="rounded-3xl p-5 bg-secondary border border-border shadow-[0_8px_30px_rgba(0,0,0,0.04)]">`
);

fs.writeFileSync(file, s, "utf8");
console.log("OK: Found cards updated (premium media frame + tinted status badges + softer filter surface).");
