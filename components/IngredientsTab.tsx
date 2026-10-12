"use client";

import { useMemo, useRef, useState } from "react";
import { categoryLabel } from "@/lib/categories";
import { weekTitle, weekWhen } from "@/lib/dates";
import Icon from "./Icon";
import Illustration from "./Illustration";
import { parseQtyField, parseQuantity, resolveProduct, formatTotals } from "@/lib/normalize";
import type { Ingredient, Meal } from "@/lib/types";

/** Une teinte par jour, pour que chaque plat ait sa couleur. */
const DAY_TINTS = [
  "boulangerie",
  "boissons",
  "boucherie",
  "poissonnerie",
  "fruits-legumes",
  "epicerie-sucree",
  "surgeles",
];

type Props = {
  /** Première semaine de l'horizon : la semaine en cours. */
  from: string;
  meals: Meal[];
  ingredients: Ingredient[];
  /** mealId null = achat hors menu, rattaché à la semaine indiquée. */
  onAdd: (mealId: number | null, weekStart: string, name: string, qty: string) => void;
  onEdit: (id: number, name: string, qty: string) => void;
  onDelete: (id: number) => void;
  /** Signale la ligne en cours de saisie, pour ne pas l'écraser. */
  onFocusIngredient: (id: number | null) => void;
  onGoToMenu: () => void;
};

/** "→ Tomates cerises · Fruits & légumes · 250 g" sous la ligne saisie. */
function Preview({ name, qty }: { name: string; qty: string }) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const parsed = parseQuantity(trimmed);
  const resolved = resolveProduct(parsed.name);
  const effective = parseQtyField(qty) ?? parsed.qty;
  const qtyLabel = effective ? formatTotals({ [effective.unit]: effective.amount }) : "";

  const parts = resolved.known
    ? [resolved.name, categoryLabel(resolved.category)]
    : [resolved.name, "inconnu, rangé dans Autres"];
  if (qtyLabel) parts.push(qtyLabel);

  return (
    <div className={`hint${resolved.known ? "" : " warn"}`}>
      {resolved.known ? "→ " : "⚠ "}
      {parts.join(" · ")}
    </div>
  );
}

function AddRow({
  mealId,
  weekStart,
  onAdd,
}: {
  mealId: number | null;
  weekStart: string;
  onAdd: Props["onAdd"];
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  /** Validation à Entrée uniquement : Tab doit pouvoir passer à la quantité. */
  function commit() {
    if (!name.trim()) return;
    onAdd(mealId, weekStart, name, qty);
    setName("");
    setQty("");
    nameRef.current?.focus();
  }

  return (
    <>
      <div className="row add">
        <span className="row-mark">
          <Icon name="plus" size={16} />
        </span>
        <input
          ref={nameRef}
          type="text"
          value={name}
          placeholder={mealId === null ? "Ajouter un produit" : "Ajouter un ingrédient"}
          enterKeyHint="done"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
        <input
          type="text"
          className="qty-input"
          value={qty}
          placeholder="qté"
          inputMode="text"
          aria-label="Quantité"
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
        />
      </div>
      <Preview name={name} qty={qty} />
    </>
  );
}

export default function IngredientsTab({
  from,
  meals,
  ingredients,
  onAdd,
  onEdit,
  onDelete,
  onFocusIngredient,
  onGoToMenu,
}: Props) {
  /**
   * Les semaines à remplir : la semaine en cours (toujours, pour avoir où
   * écrire) et toutes celles à venir qui ont déjà un plat ou un produit.
   */
  const weeks = useMemo(() => {
    const set = new Set<string>([from]);
    for (const m of meals) if (m.title.trim() && m.leftoverOf === null) set.add(m.weekStart);
    for (const i of ingredients) set.add(i.weekStart);
    return [...set].sort();
  }, [from, meals, ingredients]);

  return (
    <>
      {weeks.map((week) => {
        // Un repas « restes » n'a rien à acheter : il n'apparaît pas ici.
        const dishes = meals
          .filter((m) => m.weekStart === week && m.title.trim() && m.leftoverOf === null)
          .sort((a, b) => a.day - b.day || (a.slot === "midi" ? -1 : 1));
        const extras = ingredients.filter((i) => i.weekStart === week && i.mealId === null);
        const when = weekWhen(week, from);

        return (
          <section className="block" key={week}>
            <h2 className="block-head">
              <span>{weekTitle(week)}</span>
              <small>{when === "cours" ? "en cours" : "à venir"}</small>
            </h2>

            <div className="cards">
              {dishes.length === 0 && (
                <div className="card empty-card">
                  <Illustration name="carnet" size={92} />
                  <p>
                    Aucun plat nommé pour cette semaine.
                    <button className="btn link" onClick={onGoToMenu}>
                      Écrire le menu
                    </button>
                  </p>
                </div>
              )}

              {dishes.map((meal) => (
                <section className="card" key={meal.id} data-cat={DAY_TINTS[meal.day % 7]}>
                  <h3 className="card-head">
                    <span className="grow">{meal.title}</span>
                    <span className="tag">
                      {ingredients.filter((i) => i.mealId === meal.id).length || "—"}
                    </span>
                  </h3>
                  <div className="card-body">
                    {/* Le champ d'ajout reste en haut : sur une longue liste,
                        il ne faut pas avoir à défiler pour voir ce qu'on tape. */}
                    <AddRow mealId={meal.id} weekStart={week} onAdd={onAdd} />
                    {ingredients
                      .filter((i) => i.mealId === meal.id)
                      .map((ing) => (
                        <IngredientRow
                          key={ing.id}
                          ing={ing}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onFocusIngredient={onFocusIngredient}
                        />
                      ))}
                  </div>
                </section>
              ))}

              <section className="card" data-cat="autres">
                <h3 className="card-head">
                  <span className="grow">Hors menu</span>
                  <span className="tag">{extras.length || "—"}</span>
                </h3>
                <div className="card-body">
                  <AddRow mealId={null} weekStart={week} onAdd={onAdd} />
                  {extras.length === 0 && (
                    <p className="card-note">
                      Sopalin, pack d’eau, chips… tout ce qu’il faut acheter sans que ce soit
                      l’ingrédient d’une recette.
                    </p>
                  )}
                  {extras.map((ing) => (
                    <IngredientRow
                      key={ing.id}
                      ing={ing}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onFocusIngredient={onFocusIngredient}
                    />
                  ))}
                </div>
              </section>
            </div>
          </section>
        );
      })}
    </>
  );
}

function IngredientRow({
  ing,
  onEdit,
  onDelete,
  onFocusIngredient,
}: {
  ing: Ingredient;
  onEdit: Props["onEdit"];
  onDelete: Props["onDelete"];
  onFocusIngredient: Props["onFocusIngredient"];
}) {
  const focus = {
    onFocus: () => onFocusIngredient(ing.id),
    onBlur: () => onFocusIngredient(null),
  };
  return (
    <>
      <div className="row">
        <button
          className="row-kill"
          aria-label={`Supprimer ${ing.name}`}
          onClick={() => onDelete(ing.id)}
        >
          <Icon name="croix" size={15} />
        </button>
        <input
          type="text"
          value={ing.name}
          enterKeyHint="done"
          {...focus}
          onChange={(e) => onEdit(ing.id, e.target.value, ing.qty)}
        />
        <input
          type="text"
          className="qty-input"
          value={ing.qty}
          placeholder="qté"
          aria-label={`Quantité de ${ing.name}`}
          {...focus}
          onChange={(e) => onEdit(ing.id, ing.name, e.target.value)}
        />
      </div>
      <Preview name={ing.name} qty={ing.qty} />
    </>
  );
}
