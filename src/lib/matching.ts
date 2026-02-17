export type MatchInput = {
  item_name: string;
  description: string | null;
  category_id: number;
  location_id: number;
  date: Date; // date_lost or date_found
};

export type MatchScore = {
  score: number; // 0..100
  reasons: string[]; // for UI ("Same category", "2 shared keywords", etc.)
};

// basic text normalization -> tokens
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Score a found item against a lost item.
 * We keep it deterministic + explainable for demo/DBMS.
 */
export function scoreLostVsFound(lost: MatchInput, found: MatchInput): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  // 1) Category match (strong)
  if (lost.category_id === found.category_id) {
    score += 40;
    reasons.push("Same category");
  }

  // 2) Location match (medium)
  if (lost.location_id === found.location_id) {
    score += 25;
    reasons.push("Same location");
  }

  // 3) Date proximity (weak-medium)
  const d = daysBetween(lost.date, found.date);
  if (d <= 1) {
    score += 15;
    reasons.push("Date is within 1 day");
  } else if (d <= 3) {
    score += 10;
    reasons.push("Date is within 3 days");
  } else if (d <= 7) {
    score += 5;
    reasons.push("Date is within 7 days");
  }

  // 4) Keyword overlap (medium)
  const lostText = `${lost.item_name} ${lost.description ?? ""}`;
  const foundText = `${found.item_name} ${found.description ?? ""}`;

  const A = uniq(tokens(lostText));
  const B = uniq(tokens(foundText));

  const setB = new Set(B);
  const overlap = A.filter((t) => setB.has(t));

  // Overlap contributes up to +20 depending on ratio
  if (A.length > 0) {
    const ratio = overlap.length / Math.max(1, A.length);
    const kwScore = Math.round(Math.min(20, ratio * 28)); // cap at 20
    if (kwScore > 0) score += kwScore;
  }

  if (overlap.length >= 1) reasons.push(`${overlap.length} shared keyword(s)`);

  // clamp
  score = Math.max(0, Math.min(100, score));

  return { score, reasons };
}
