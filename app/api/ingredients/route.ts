import { db, ensureSchema, weekId } from "@/lib/db";
import { body, handle } from "@/lib/api";
import { isValidWeekStart } from "@/lib/dates";

/**
 * Les nouveaux ingrédients prennent une position plus petite que la plus
 * petite existante : ils apparaissent donc en tête, juste sous le champ de
 * saisie, sans réordonner ce qui était déjà saisi.
 */
type NewIngredient = {
  /** null pour un achat hors menu : il est alors rattaché à weekStart. */
  mealId: number | null;
  weekStart?: string;
  name: string;
  qty?: string;
};

export async function POST(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const { mealId, weekStart, name, qty } = await body<NewIngredient>(req);
    const clean = String(name ?? "").trim();
    if (!clean) throw new Error("Le nom de l'ingrédient est vide.");

    const sql = db();
    const cleanQty = String(qty ?? "").trim();

    if (mealId === null || mealId === undefined) {
      if (!weekStart || !isValidWeekStart(weekStart)) throw new Error("Semaine invalide.");
      const wid = await weekId(weekStart);
      const rows = (await sql`
        insert into ingredients (week_id, name, qty, position)
        values (
          ${wid}, ${clean}, ${cleanQty},
          coalesce((select min(position) - 1 from ingredients where week_id = ${wid}), 0)
        )
        returning id`) as { id: number }[];
      return { id: rows[0].id };
    }

    if (!Number.isInteger(mealId)) throw new Error("Repas invalide.");
    const rows = (await sql`
      insert into ingredients (meal_id, name, qty, position)
      values (
        ${mealId}, ${clean}, ${cleanQty},
        coalesce((select min(position) - 1 from ingredients where meal_id = ${mealId}), 0)
      )
      returning id`) as { id: number }[];
    return { id: rows[0].id };
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const { id, name, qty } = await body<{ id: number; name: string; qty?: string }>(req);
    if (!Number.isInteger(id)) throw new Error("Ingrédient invalide.");
    const clean = String(name ?? "").trim();
    if (!clean) throw new Error("Le nom de l'ingrédient est vide.");
    const sql = db();
    await sql`update ingredients set name = ${clean}, qty = ${String(qty ?? "").trim()} where id = ${id}`;
    return { ok: true };
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!Number.isInteger(id)) throw new Error("Ingrédient invalide.");
    await db()`delete from ingredients where id = ${id}`;
    return { ok: true };
  });
}
