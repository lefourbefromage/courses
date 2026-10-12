import type { SlotId } from "./dates";

export type Meal = {
  id: number;
  /** Lundi de la semaine du repas, en "YYYY-MM-DD". */
  weekStart: string;
  day: number;
  slot: SlotId;
  title: string;
  /** Repas dont celui-ci est les restes : rien à racheter. */
  leftoverOf: number | null;
  /** Lien vers la recette, chaîne vide s'il n'y en a pas. */
  link: string;
};

export type Ingredient = {
  id: number;
  /** Semaine à laquelle l'ingrédient appartient (via son repas ou directement). */
  weekStart: string;
  /** null = achat hors menu, rattaché à la semaine. */
  mealId: number | null;
  name: string;
  qty: string;
};

export type Prefs = {
  categoryOrder: string[];
  overrides: Record<string, string>;
};

/** Cases cochées : clé d'article -> quantités au moment du cochage. */
export type Checks = Record<string, Record<string, number>>;

export type WeekState = {
  /** Semaine affichée dans l'onglet Menu. */
  weekStart: string;
  /** Début de l'horizon « à venir » : repas et ingrédients au-delà sont fournis. */
  from: string;
  weeks: string[];
  meals: Meal[];
  ingredients: Ingredient[];
  prefs: Prefs;
  /** Partagées entre les appareils : ce que l'autre a déjà mis dans le caddie. */
  checks: Checks;
};
