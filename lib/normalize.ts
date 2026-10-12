import { CANONICAL_SLUGS, PRODUCT_INDEX } from "./products";
import type { CategoryId } from "./categories";

/* ------------------------------------------------------------------ slugs */

const FILLERS = new Set([
  "de", "du", "des", "d", "la", "le", "les", "l", "en", "au", "aux",
  "a", "pour", "avec", "et", "un", "une", "sans",
]);

/** Enlève accents, casse, ponctuation et pluriels : "Oignons jaune" -> "oignon jaune". */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length > 3 && /(s|x)$/.test(w) ? w.slice(0, -1) : w))
    .join(" ");
}

function withoutFillers(slug: string): string {
  return slug.split(" ").filter((w) => !FILLERS.has(w)).join(" ");
}

/* -------------------------------------------------------------- quantités */

export type Qty = { unit: string; amount: number };

/** Unités reconnues -> unité de base stockée, avec facteur de conversion. */
const UNITS: Record<string, { base: string; factor: number }> = {
  g: { base: "g", factor: 1 },
  gr: { base: "g", factor: 1 },
  gramme: { base: "g", factor: 1 },
  grammes: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  kilo: { base: "g", factor: 1000 },
  kilos: { base: "g", factor: 1000 },
  ml: { base: "ml", factor: 1 },
  cl: { base: "ml", factor: 10 },
  dl: { base: "ml", factor: 100 },
  l: { base: "ml", factor: 1000 },
  litre: { base: "ml", factor: 1000 },
  litres: { base: "ml", factor: 1000 },
  boite: { base: "boîte", factor: 1 },
  boites: { base: "boîte", factor: 1 },
  "boîte": { base: "boîte", factor: 1 },
  "boîtes": { base: "boîte", factor: 1 },
  conserve: { base: "boîte", factor: 1 },
  conserves: { base: "boîte", factor: 1 },
  bocal: { base: "bocal", factor: 1 },
  sachet: { base: "sachet", factor: 1 },
  sachets: { base: "sachet", factor: 1 },
  paquet: { base: "paquet", factor: 1 },
  paquets: { base: "paquet", factor: 1 },
  pot: { base: "pot", factor: 1 },
  pots: { base: "pot", factor: 1 },
  brique: { base: "brique", factor: 1 },
  briques: { base: "brique", factor: 1 },
  bouteille: { base: "bouteille", factor: 1 },
  bouteilles: { base: "bouteille", factor: 1 },
  pack: { base: "pack", factor: 1 },
  packs: { base: "pack", factor: 1 },
  tranche: { base: "tranche", factor: 1 },
  tranches: { base: "tranche", factor: 1 },
  botte: { base: "botte", factor: 1 },
  bottes: { base: "botte", factor: 1 },
  gousse: { base: "gousse", factor: 1 },
  gousses: { base: "gousse", factor: 1 },
  branche: { base: "branche", factor: 1 },
  branches: { base: "branche", factor: 1 },
  barquette: { base: "barquette", factor: 1 },
  barquettes: { base: "barquette", factor: 1 },
  rouleau: { base: "rouleau", factor: 1 },
  rouleaux: { base: "rouleau", factor: 1 },
  tablette: { base: "tablette", factor: 1 },
  tablettes: { base: "tablette", factor: 1 },
  canette: { base: "canette", factor: 1 },
  canettes: { base: "canette", factor: 1 },
  piece: { base: "pièce", factor: 1 },
  pieces: { base: "pièce", factor: 1 },
  "pièce": { base: "pièce", factor: 1 },
  "pièces": { base: "pièce", factor: 1 },
  cuillere: { base: "c. à soupe", factor: 1 },
  cuilleres: { base: "c. à soupe", factor: 1 },
  "cuillère": { base: "c. à soupe", factor: 1 },
  "cuillères": { base: "c. à soupe", factor: 1 },
  cas: { base: "c. à soupe", factor: 1 },
  cac: { base: "c. à café", factor: 1 },
};

const PLURALS: Record<string, string> = {
  boîte: "boîtes",
  bocal: "bocaux",
  sachet: "sachets",
  paquet: "paquets",
  pot: "pots",
  brique: "briques",
  bouteille: "bouteilles",
  pack: "packs",
  tranche: "tranches",
  botte: "bottes",
  gousse: "gousses",
  branche: "branches",
  barquette: "barquettes",
  rouleau: "rouleaux",
  tablette: "tablettes",
  canette: "canettes",
  pièce: "pièces",
};

const UNIT_PATTERN = Object.keys(UNITS)
  .sort((a, b) => b.length - a.length)
  .join("|");

function toQty(rawAmount: string, rawUnit: string | undefined): Qty | null {
  const amount = Number(rawAmount.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!rawUnit) return { unit: "", amount };
  const spec = UNITS[rawUnit.toLowerCase()];
  if (!spec) return { unit: "", amount };
  return { unit: spec.base, amount: amount * spec.factor };
}

export type Parsed = { name: string; qty: Qty | null };

/**
 * Sépare un libellé libre en nom + quantité.
 * Gère "Roquette x2", "250g Porc haché", "4 cuisses de poulet",
 * "2 boîtes de tomates", "Farine 500 g".
 */
export function parseQuantity(input: string): Parsed {
  let text = input.replace(/\s+/g, " ").trim();
  if (!text) return { name: "", qty: null };

  // "Roquette x2", "Roquette (x2)", "Roquette ×2"
  let m = text.match(/[\s(]*[x×*]\s*(\d+(?:[.,]\d+)?)\s*\)?\s*$/i);
  if (m) {
    const qty = toQty(m[1], undefined);
    return { name: cleanName(text.slice(0, m.index)), qty };
  }

  // "2x tomates"
  m = text.match(/^(\d+(?:[.,]\d+)?)\s*[x×*]\s+/i);
  if (m) {
    return { name: cleanName(text.slice(m[0].length)), qty: toQty(m[1], undefined) };
  }

  // "250g Porc haché", "400 g de tomate", "2 boîtes de tomates"
  m = text.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})\\b\\.?\\s*`, "i"));
  if (m) {
    return { name: cleanName(text.slice(m[0].length)), qty: toQty(m[1], m[2]) };
  }

  // "Farine 500 g"
  m = text.match(new RegExp(`\\s(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})\\b\\.?$`, "i"));
  if (m) {
    return { name: cleanName(text.slice(0, m.index)), qty: toQty(m[1], m[2]) };
  }

  // "4 cuisses de poulet"
  m = text.match(/^(\d+(?:[.,]\d+)?)\s+(?=[a-zà-ÿ])/i);
  if (m) {
    return { name: cleanName(text.slice(m[0].length)), qty: toQty(m[1], undefined) };
  }

  // "Tomates 3"
  m = text.match(/\s(\d+)$/);
  if (m) {
    return { name: cleanName(text.slice(0, m.index)), qty: toQty(m[1], undefined) };
  }

  return { name: cleanName(text), qty: null };
}

function cleanName(s: string): string {
  return s
    .replace(/^[\s,;:.\-–]+|[\s,;:.\-–]+$/g, "")
    .replace(/^(?:de\s+|du\s+|des\s+|d['’]\s*)/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lit le champ quantité saisi à la main : "2", "500 g", "x2", "2 boîtes". */
export function parseQtyField(field: string | null | undefined): Qty | null {
  if (!field) return null;
  const text = field.replace(/\s+/g, " ").trim();
  if (!text) return null;
  let m = text.match(new RegExp(`^[x×*]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})?\\b\\.?$`, "i"));
  if (m) return toQty(m[1], m[2]);
  m = text.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_PATTERN})\\b`, "i"));
  if (m) return toQty(m[1], m[2]);
  return null;
}

/* --------------------------------------------------- correction & rayonnage */

function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (row[j] < best) best = row[j];
    }
    if (best > max) return max + 1;
    prev = row;
  }
  return prev[b.length];
}

function tolerance(len: number): number {
  if (len <= 4) return 0;
  if (len <= 7) return 1;
  if (len <= 12) return 2;
  return 3;
}

export type Resolved = {
  /** Nom affiché, orthographe canonique quand le produit est connu. */
  name: string;
  category: CategoryId;
  /** Clé de regroupement des doublons. */
  key: string;
  /** true si le libellé saisi a été réécrit. */
  corrected: boolean;
  known: boolean;
};

const cache = new Map<string, Resolved>();

/** Trouve le produit du dictionnaire correspondant à un libellé saisi. */
export function resolveProduct(rawName: string): Resolved {
  const cached = cache.get(rawName);
  if (cached) return cached;

  const slug = slugify(rawName);
  const result = lookup(rawName, slug);
  cache.set(rawName, result);
  return result;
}

function lookup(rawName: string, slug: string): Resolved {
  const finish = (name: string, category: CategoryId, key: string, known: boolean): Resolved => ({
    name,
    category,
    key,
    corrected: known && slugify(rawName) !== slugify(name),
    known,
  });

  if (!slug) return finish(rawName.trim(), "autres", "", false);

  // 1. correspondance exacte (nom canonique ou alias)
  const exact = PRODUCT_INDEX.get(slug);
  if (exact) return finish(exact.canonical, exact.category, slugify(exact.canonical), true);

  // 2. sans les mots de liaison
  const bare = withoutFillers(slug);
  if (bare && bare !== slug) {
    const hit = PRODUCT_INDEX.get(bare);
    if (hit) return finish(hit.canonical, hit.category, slugify(hit.canonical), true);
  }

  // 3. correction orthographique floue
  const target = bare || slug;
  let best: { slug: string; product: (typeof CANONICAL_SLUGS)[number]["product"] } | null = null;
  let bestDist = Infinity;
  const max = tolerance(target.length);
  if (max > 0) {
    for (const entry of CANONICAL_SLUGS) {
      const d = levenshtein(target, entry.slug, max);
      if (d <= max && d < bestDist) {
        bestDist = d;
        best = entry;
        if (d === 0) break;
      }
    }
  }
  if (best) {
    return finish(best.product.canonical, best.product.category, slugify(best.product.canonical), true);
  }

  // 4. le libellé contient un produit connu ("aiguillettes de poulet" contient
  //    Poulet) : on lui emprunte son rayon, mais on garde le nom saisi, plus
  //    précis. Il reste un article à part, sans se fondre dans « Poulet ».
  const words = target.split(" ");
  let contained: { len: number; product: (typeof CANONICAL_SLUGS)[number]["product"] } | null = null;
  for (const entry of CANONICAL_SLUGS) {
    const parts = entry.slug.split(" ");
    if (parts.length > words.length) continue;
    if (entry.slug.length < 4) continue;
    const found = words.some((_, i) => parts.every((p, k) => words[i + k] === p));
    if (found && (!contained || entry.slug.length > contained.len)) {
      contained = { len: entry.slug.length, product: entry.product };
    }
  }
  if (contained) {
    return finish(prettify(rawName), contained.product.category, slug, true);
  }

  // 5. inconnu : on garde le libellé tel quel, rayon "Autres"
  return finish(prettify(rawName), "autres", slug, false);
}

function prettify(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t ? t[0].toLocaleUpperCase("fr-FR") + t.slice(1) : t;
}

/* ------------------------------------------------------------- agrégation */

function fmtNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/** Additionne les quantités par unité et produit un libellé lisible. */
export function formatTotals(totals: Record<string, number>): string {
  const parts: string[] = [];
  const entries = Object.entries(totals).filter(([, v]) => v > 0);
  const measured = entries.filter(([u]) => u !== "");
  const count = totals[""] ?? 0;

  for (const [unit, amount] of measured) {
    if (unit === "g") {
      parts.push(amount >= 1000 ? `${fmtNumber(amount / 1000)} kg` : `${fmtNumber(amount)} g`);
    } else if (unit === "ml") {
      parts.push(amount >= 1000 ? `${fmtNumber(amount / 1000)} L` : `${fmtNumber(amount)} ml`);
    } else {
      const label = amount > 1 ? PLURALS[unit] ?? unit : unit;
      parts.push(`${fmtNumber(amount)} ${label}`);
    }
  }

  // "1" seul n'apporte rien : ni à côté d'un poids, ni tout court
  if (count > 1) {
    parts.unshift(measured.length > 0 ? fmtNumber(count) : `×${fmtNumber(count)}`);
  } else if (count === 1 && measured.length === 0) {
    return "";
  }

  return parts.join(" + ");
}
