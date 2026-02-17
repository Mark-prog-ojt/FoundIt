/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const file = path.join(process.cwd(), "src/app/globals.css");
let s = fs.readFileSync(file, "utf8");

const rootBlock = `:root {
  --radius: 0.75rem;

  /* Apple-like neutral ramp (light) */
  --background: #F5F5F7;
  --foreground: #1C1C1E;

  --card: #FFFFFF;
  --card-foreground: #1C1C1E;

  --popover: #FFFFFF;
  --popover-foreground: #1C1C1E;

  /* Accent */
  --primary: #0A84FF;
  --primary-foreground: #FFFFFF;

  /* Surfaces */
  --secondary: #F2F2F7;
  --secondary-foreground: #1C1C1E;

  --muted: #F2F2F7;
  --muted-foreground: #6E6E73;

  --accent: #F2F2F7;
  --accent-foreground: #1C1C1E;

  /* System */
  --destructive: #FF3B30;
  --border: rgba(0, 0, 0, 0.08);
  --input: rgba(0, 0, 0, 0.12);
  --ring: rgba(10, 132, 255, 0.45);

  /* Charts (leave as-is) */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  /* Sidebar */
  --sidebar: #FFFFFF;
  --sidebar-foreground: #1C1C1E;
  --sidebar-primary: #0A84FF;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #F2F2F7;
  --sidebar-accent-foreground: #1C1C1E;
  --sidebar-border: rgba(0, 0, 0, 0.08);
  --sidebar-ring: rgba(10, 132, 255, 0.45);
}`;

const darkBlock = `.dark {
  /* Apple-like neutral ramp (dark) */
  --background: #0B0F14;
  --foreground: #F9FAFB;

  --card: #111827;
  --card-foreground: #F9FAFB;

  --popover: #111827;
  --popover-foreground: #F9FAFB;

  /* Accent */
  --primary: #0A84FF;
  --primary-foreground: #FFFFFF;

  /* Surfaces */
  --secondary: #0F172A;
  --secondary-foreground: #F9FAFB;

  --muted: #0F172A;
  --muted-foreground: #9CA3AF;

  --accent: #0F172A;
  --accent-foreground: #F9FAFB;

  /* System */
  --destructive: #FF453A;
  --border: rgba(255, 255, 255, 0.10);
  --input: rgba(255, 255, 255, 0.12);
  --ring: rgba(10, 132, 255, 0.55);

  /* Charts (leave as-is) */
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);

  /* Sidebar */
  --sidebar: #111827;
  --sidebar-foreground: #F9FAFB;
  --sidebar-primary: #0A84FF;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #0F172A;
  --sidebar-accent-foreground: #F9FAFB;
  --sidebar-border: rgba(255, 255, 255, 0.10);
  --sidebar-ring: rgba(10, 132, 255, 0.55);
}`;

function mustReplace(re, replacement, label) {
  const next = s.replace(re, replacement);
  if (next === s) {
    console.error(`Patch failed: could not replace ${label}.`);
    process.exit(1);
  }
  s = next;
}

mustReplace(
  /:root\s*\{[\s\S]*?\}\n\n\.dark\s*\{/m,
  `${rootBlock}\n\n.dark {`,
  ":root block"
);

mustReplace(
  /\.dark\s*\{[\s\S]*?\}\n\n@layer base/m,
  `${darkBlock}\n\n@layer base`,
  ".dark block"
);

fs.writeFileSync(file, s, "utf8");
console.log("OK: globals.css updated to premium neutral + iOS blue accent.");
