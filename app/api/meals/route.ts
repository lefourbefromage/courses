import { db, ensureSchema, findWeekId, weekId } from "@/lib/db";
import { body, handle } from "@/lib/api";
import { isValidWeekStart } from "@/lib/dates";
import { normalizeLink } from "@/lib/links";

type Payload = {
  weekStart: string;
  day: number;
  slot: string;
  /** Absent = ne pas toucher au titre. */
  title?: string;
  /** Absent = ne pas toucher au lien ; null = enlever le lien. */
  leftoverOf?: number | null;
  /** Absent = ne pas toucher au lien de recette ; "" = le retirer. */
  link?: string;
};

type Row = { id: number; title: string; leftover_of: number | null; link: string };

export async function PUT(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const { weekStart, day, slot, title, leftoverOf, link } = await body<Payload>(req);
    if (!isValidWeekStart(weekStart)) throw new Error("Semaine invalide.");
    if (!Number.isInteger(day) || day < 0 || day > 6) throw new Error("Jour invalide.");
    if (slot !== "midi" && slot !== "soir") throw new Error("Service invalide.");

    const sql = db();
    // On ne crée pas la semaine tant qu'on n'a rien à y écrire : une requête
    // refusée ne doit pas laisser de semaine vide dans l'historique.
    const existingWeek = await findWeekId(weekStart);

    const existing = existingWeek
      ? ((await sql`
          select id, title, leftover_of, link from meals
          where week_id = ${existingWeek} and day = ${day} and slot = ${slot}`) as Row[])
      : [];
    const current = existing[0] ?? null;

    const nextTitle = title !== undefined ? String(title).trim() : (current?.title ?? "");
    let nextLeftover =
      leftoverOf !== undefined ? leftoverOf : (current?.leftover_of ?? null);

    let nextLink = current?.link ?? "";
    if (link !== undefined) {
      const clean = normalizeLink(String(link));
      if (clean === null) throw new Error("Ce lien n'est pas une adresse web valide.");
      nextLink = clean;
    }

    if (nextLeftover !== null) {
      if (!Number.isInteger(nextLeftover)) throw new Error("Repas source invalide.");
      if (current && nextLeftover === current.id) throw new Error("Un repas ne peut pas être ses propres restes.");
      // La source doit être un vrai repas de la même semaine, pas des restes :
      // on évite ainsi les chaînes de restes de restes.
      const source = existingWeek
        ? ((await sql`
            select id from meals
            where id = ${nextLeftover} and week_id = ${existingWeek}
              and leftover_of is null and title <> ''`) as { id: number }[])
        : [];
      if (!source.length) throw new Error("Ce repas source n'existe plus.");
    }

    // Un créneau sans titre ni lien de restes n'existe pas : on le supprime,
    // ce qui emporte ses ingrédients.
    if (!nextTitle && nextLeftover === null) {
      if (current) await sql`delete from meals where id = ${current.id}`;
      return { id: null, leftoverOf: null };
    }

    const wid = existingWeek ?? (await weekId(weekStart));
    const rows = (await sql`
      insert into meals (week_id, day, slot, title, leftover_of, link)
      values (${wid}, ${day}, ${slot}, ${nextTitle}, ${nextLeftover}, ${nextLink})
      on conflict (week_id, day, slot) do update
        set title = excluded.title,
            leftover_of = excluded.leftover_of,
            link = excluded.link
      returning id`) as { id: number }[];

    // Des restes n'ont pas d'ingrédients propres.
    if (nextLeftover !== null) {
      await sql`delete from ingredients where meal_id = ${rows[0].id}`;
    }

    return { id: rows[0].id, leftoverOf: nextLeftover, link: nextLink };
  });
}
