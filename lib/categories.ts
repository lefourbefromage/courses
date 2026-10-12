import type { IconName } from "@/components/Icon";

/** Rayons, dans l'ordre de parcours par défaut d'un supermarché. */
export const CATEGORIES = [
  { id: "fruits-legumes", label: "Fruits & légumes", icon: "pomme" },
  { id: "boulangerie", label: "Boulangerie", icon: "baguette" },
  { id: "boucherie", label: "Boucherie & charcuterie", icon: "viande" },
  { id: "poissonnerie", label: "Poissonnerie", icon: "poisson" },
  { id: "cremerie", label: "Crémerie & fromages", icon: "fromage" },
  { id: "epicerie-salee", label: "Épicerie salée", icon: "conserve" },
  { id: "monde", label: "Produits du monde", icon: "bol" },
  { id: "epicerie-sucree", label: "Épicerie sucrée", icon: "gateau" },
  { id: "boissons", label: "Boissons", icon: "bouteille" },
  { id: "surgeles", label: "Surgelés", icon: "flocon" },
  { id: "entretien", label: "Hygiène & entretien", icon: "spray" },
  { id: "autres", label: "Autres", icon: "carton" },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const DEFAULT_ORDER: CategoryId[] = CATEGORIES.map((c) => c.id);

const BY_ID = new Map(CATEGORIES.map((c) => [c.id as string, c]));

export function categoryLabel(id: string): string {
  return BY_ID.get(id)?.label ?? "Autres";
}

export function categoryIcon(id: string): IconName {
  return BY_ID.get(id)?.icon ?? "carton";
}

export function isCategoryId(id: string): id is CategoryId {
  return BY_ID.has(id);
}

/**
 * Applique un ordre enregistré. Un rayon ajouté après coup se glisse à sa
 * place par défaut, juste derrière le voisin qui le précède : sans ça il
 * atterrirait tout à la fin, après « Autres ».
 */
export function resolveOrder(saved: string[] | null | undefined): CategoryId[] {
  if (!saved || saved.length === 0) return DEFAULT_ORDER;
  const order = [...new Set(saved.filter(isCategoryId))];
  DEFAULT_ORDER.forEach((id, rank) => {
    if (order.includes(id)) return;
    let at = order.length;
    for (let before = rank - 1; before >= 0; before--) {
      const position = order.indexOf(DEFAULT_ORDER[before]);
      if (position >= 0) {
        at = position + 1;
        break;
      }
    }
    order.splice(at, 0, id);
  });
  return order;
}
