import { parseQuantity, resolveProduct, formatTotals } from "../lib/normalize";
import { categoryLabel, DEFAULT_ORDER } from "../lib/categories";
import { PRODUCT_COUNT } from "../lib/products";

const RAW = `Patates
Wraps
Pain bagel
Poisson pané
Carottes
Lard
Cheddar rapé
Jambon blanc
Concombre
Roquette x2
Tomates x2
Oeufs x2
Saint moret
Avocat
Rumo papillon
250g Porc haché 
Poivron x2
Farine
Pinsa
Tomates cerise
Haricot rouge
Aubergine
4 cuisses de poulet
Concassé de tomate
Coeur d'artichaut x2
Piment rouge
Courgette
Citron jaune
Mozza
Poulet
Coriandre
250g viande haché
400g de tomate en conserve
Burrata
150g yahourt grec
Jambon cru
Pack d'eau
Oignons jaune
Carotte
Piment d'espelette
kiri
Skyr
Udon
Oignons rouge
Paprika fumée
Coriandre moulu
levure
Chips nature
Curry
lait d'avoine
Sopalin
2 boîtes de tomates pelées
Farine 500 g`.split("\n").filter(Boolean);

console.log(`Dictionnaire : ${PRODUCT_COUNT} produits\n`);

type Agg = { name: string; cat: string; totals: Record<string, number>; raws: string[]; corrected: boolean; known: boolean };
const byKey = new Map<string, Agg>();

for (const line of RAW) {
  const { name, qty } = parseQuantity(line);
  const r = resolveProduct(name);
  const key = r.key || name.toLowerCase();
  let agg = byKey.get(key);
  if (!agg) {
    agg = { name: r.name, cat: r.category, totals: {}, raws: [], corrected: false, known: r.known };
    byKey.set(key, agg);
  }
  const unit = qty?.unit ?? "";
  agg.totals[unit] = (agg.totals[unit] ?? 0) + (qty?.amount ?? 1);
  agg.raws.push(line.trim());
  if (r.corrected) agg.corrected = true;
}

for (const cat of DEFAULT_ORDER) {
  const items = [...byKey.values()].filter((i) => i.cat === cat).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  if (!items.length) continue;
  console.log(`\n=== ${categoryLabel(cat)} (${items.length}) ===`);
  for (const it of items) {
    const q = formatTotals(it.totals);
    const flag = !it.known ? "  ⚠️ INCONNU" : it.corrected ? `  ↩︎ écrit « ${it.raws.join(" / ")} »` : "";
    console.log(`  ${it.name}${q ? "   [" + q + "]" : ""}${flag}`);
  }
}
console.log(`\nTotal lignes: ${RAW.length} -> ${byKey.size} items dans la liste`);
