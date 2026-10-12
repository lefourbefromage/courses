import { categoryIcon, categoryLabel, isCategoryId, resolveOrder } from "./categories";
import { formatTotals, parseQtyField, parseQuantity, resolveProduct } from "./normalize";
import { DAYS, SLOTS } from "./dates";
import type { Ingredient, Meal, Prefs } from "./types";
import type { IconName } from "@/components/Icon";

export type ListItem = {
  key: string;
  name: string;
  category: string;
  qtyLabel: string;
  totals: Record<string, number>;
  /** Repas qui réclament cet item, pour savoir pourquoi il est là. */
  sources: string[];
  /** Libellés saisis, quand ils diffèrent du nom affiché. */
  rawNames: string[];
  corrected: boolean;
  known: boolean;
  /** true si un rayon a été choisi à la main pour cet article. */
  overridden: boolean;
};

export type ListGroup = {
  category: string;
  label: string;
  icon: IconName;
  items: ListItem[];
};

function slotLabel(slot: string): string {
  return SLOTS.find((s) => s.id === slot)?.label ?? slot;
}

/**
 * Transforme les ingrédients des repas en liste de courses :
 * quantités extraites, doublons fusionnés, orthographe canonique, rayons triés.
 */
export function buildList(
  meals: Meal[],
  ingredients: Ingredient[],
  prefs: Prefs,
): ListGroup[] {
  const mealById = new Map(meals.map((m) => [m.id, m]));
  const items = new Map<string, ListItem>();

  for (const ing of ingredients) {
    // Un repas « restes » ne fait rien acheter.
    if (ing.mealId !== null && mealById.get(ing.mealId)?.leftoverOf != null) continue;
    const parsedName = parseQuantity(ing.name);
    const fieldQty = parseQtyField(ing.qty);
    const qty = fieldQty ?? parsedName.qty;
    const resolved = resolveProduct(parsedName.name);
    const key = resolved.key || parsedName.name.toLowerCase();
    if (!key) continue;

    const override = prefs.overrides[key];
    const overridden = Boolean(override && isCategoryId(override));
    const category = overridden ? override : resolved.category;

    let item = items.get(key);
    if (!item) {
      item = {
        key,
        name: resolved.name,
        category,
        qtyLabel: "",
        totals: {},
        sources: [],
        rawNames: [],
        corrected: false,
        known: resolved.known,
        overridden,
      };
      items.set(key, item);
    }
    item.category = category;
    item.overridden = overridden;

    const unit = qty?.unit ?? "";
    item.totals[unit] = (item.totals[unit] ?? 0) + (qty?.amount ?? 1);

    const source =
      ing.mealId === null
        ? "Hors menu"
        : (() => {
            const meal = mealById.get(ing.mealId);
            return meal ? `${DAYS[meal.day]} ${slotLabel(meal.slot).toLowerCase()} · ${meal.title}` : null;
          })();
    if (source && !item.sources.includes(source)) item.sources.push(source);
    const raw = ing.name.trim();
    if (raw && raw.toLowerCase() !== item.name.toLowerCase() && !item.rawNames.includes(raw)) {
      item.rawNames.push(raw);
    }
    if (resolved.corrected) item.corrected = true;
  }

  for (const item of items.values()) {
    item.qtyLabel = formatTotals(item.totals);
  }

  const order = resolveOrder(prefs.categoryOrder);
  const groups: ListGroup[] = [];
  for (const category of order) {
    const list = [...items.values()]
      .filter((i) => i.category === category)
      .sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" }));
    if (list.length) {
      groups.push({
        category,
        label: categoryLabel(category),
        icon: categoryIcon(category),
        items: list,
      });
    }
  }
  return groups;
}

/** Signature des quantités : sert à décocher un item dont la quantité augmente. */
export function totalsSignature(totals: Record<string, number>): string {
  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([u, v]) => `${u}:${v}`)
    .join("|");
}

export function quantityIncreased(
  previous: Record<string, number> | undefined,
  next: Record<string, number>,
): boolean {
  if (!previous) return false;
  for (const [unit, amount] of Object.entries(next)) {
    if (amount > (previous[unit] ?? 0)) return true;
  }
  return false;
}
