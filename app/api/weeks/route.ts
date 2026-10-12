import { db, ensureSchema, weekId } from "@/lib/db";
import { body, handle } from "@/lib/api";
import { isValidWeekStart } from "@/lib/dates";

export async function POST(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const { weekStart, copyFrom } = await body<{ weekStart: string; copyFrom?: string }>(req);
    if (!isValidWeekStart(weekStart)) throw new Error("Semaine invalide.");

    const sql = db();
    const target = await weekId(weekStart);

    if (copyFrom && isValidWeekStart(copyFrom) && copyFrom !== weekStart) {
      const source = (await sql`
        select id from weeks where week_start = ${copyFrom}`) as { id: number }[];
      if (source.length) {
        await sql`delete from meals where week_id = ${target}`;
        await sql`delete from ingredients where week_id = ${target}`;
        const created = (await sql`
          insert into meals (week_id, day, slot, title, link)
          select ${target}, day, slot, title, link from meals where week_id = ${source[0].id}
          returning id, day, slot`) as { id: number; day: number; slot: string }[];
        // Les liens « restes de » pointaient vers les repas de la semaine
        // source : on les fait pointer vers les copies correspondantes.
        await sql`
          update meals copie
          set leftover_of = copie_source.id
          from meals ancien
          join meals ancienne_source on ancienne_source.id = ancien.leftover_of
          join meals copie_source
            on copie_source.week_id = ${target}
           and copie_source.day = ancienne_source.day
           and copie_source.slot = ancienne_source.slot
          where copie.week_id = ${target}
            and ancien.week_id = ${source[0].id}
            and ancien.day = copie.day
            and ancien.slot = copie.slot
            and ancien.leftover_of is not null`;
        for (const meal of created) {
          await sql`
            insert into ingredients (meal_id, name, qty, position)
            select ${meal.id}, i.name, i.qty, i.position
            from ingredients i
            join meals m on m.id = i.meal_id
            where m.week_id = ${source[0].id} and m.day = ${meal.day} and m.slot = ${meal.slot}`;
        }
        // les achats hors menu suivent aussi la copie
        await sql`
          insert into ingredients (week_id, name, qty, position)
          select ${target}, name, qty, position
          from ingredients where week_id = ${source[0].id}`;
      }
    }
    return { weekStart };
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const week = new URL(req.url).searchParams.get("week");
    if (!week || !isValidWeekStart(week)) throw new Error("Semaine invalide.");
    await db()`delete from weeks where week_start = ${week}`;
    return { ok: true };
  });
}
