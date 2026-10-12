import { db, ensureSchema } from "@/lib/db";
import { handle } from "@/lib/api";
import { currentWeekStart, isValidWeekStart } from "@/lib/dates";
import { DEFAULT_ORDER } from "@/lib/categories";
import type { Checks, Ingredient, Meal, WeekState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle<WeekState>(async () => {
    await ensureSchema();
    const sql = db();

    const params = new URL(req.url).searchParams;
    const asked = params.get("week");
    const askedFrom = params.get("from");
    // La semaine « en cours » est celle du navigateur : c'est son fuseau qui
    // compte, pas celui du serveur.
    const from = askedFrom && isValidWeekStart(askedFrom) ? askedFrom : currentWeekStart();
    const weekStart = asked && isValidWeekStart(asked) ? asked : from;

    // Seules les semaines qui contiennent quelque chose méritent l'historique.
    const weekRows = (await sql`
      select to_char(w.week_start, 'YYYY-MM-DD') as week_start
      from weeks w
      where exists (select 1 from meals m where m.week_id = w.id)
         or exists (select 1 from ingredients i where i.week_id = w.id)
      order by w.week_start desc
    `) as { week_start: string }[];

    // On renvoie la semaine affichée dans le Menu *et* tout ce qui est à venir :
    // les onglets Ingrédients et Courses travaillent sur cet horizon.
    const mealRows = (await sql`
      select m.id, to_char(w.week_start, 'YYYY-MM-DD') as week_start,
             m.day, m.slot, m.title, m.leftover_of, m.link
      from meals m join weeks w on w.id = m.week_id
      where w.week_start = ${weekStart} or w.week_start >= ${from}
      order by w.week_start, m.day, m.slot
    `) as {
      id: number;
      week_start: string;
      day: number;
      slot: string;
      title: string;
      leftover_of: number | null;
      link: string;
    }[];

    // Les deux sortes d'ingrédients d'un coup : ceux d'un repas et ceux
    // rattachés directement à une semaine (hors menu).
    const ingredientRows = (await sql`
      select i.id, to_char(w.week_start, 'YYYY-MM-DD') as week_start,
             i.meal_id, i.name, i.qty
      from ingredients i
      left join meals m on m.id = i.meal_id
      join weeks w on w.id = coalesce(i.week_id, m.week_id)
      where w.week_start = ${weekStart} or w.week_start >= ${from}
      order by w.week_start, i.meal_id nulls last, i.position, i.id
    `) as {
      id: number;
      week_start: string;
      meal_id: number | null;
      name: string;
      qty: string;
    }[];

    // Les cases cochées sont communes aux appareils : elles voyagent avec
    // le reste, donc le battement de rafraîchissement les apporte tout seul.
    // Elles ne valent que pour la semaine en cours : celles d'avant sont
    // effacées, pour qu'un article racheté cette semaine reparte décoché.
    await sql`delete from checks where week_start is null or week_start < ${from}`;
    const checkRows = (await sql`
      select item_key, totals from checks where week_start = ${from}
    `) as { item_key: string; totals: Record<string, number> | null }[];

    const prefRows = (await sql`select key, value from prefs`) as {
      key: string;
      value: unknown;
    }[];
    const prefMap = new Map(prefRows.map((r) => [r.key, r.value]));

    const meals: Meal[] = mealRows.map((m) => ({
      id: m.id,
      weekStart: m.week_start,
      day: m.day,
      slot: m.slot === "soir" ? "soir" : "midi",
      title: m.title,
      leftoverOf: m.leftover_of,
      link: m.link ?? "",
    }));
    const ingredients: Ingredient[] = ingredientRows.map((i) => ({
      id: i.id,
      weekStart: i.week_start,
      mealId: i.meal_id,
      name: i.name,
      qty: i.qty,
    }));

    const checks: Checks = {};
    for (const row of checkRows) checks[row.item_key] = row.totals ?? {};

    return {
      weekStart,
      from,
      weeks: weekRows.map((r) => r.week_start),
      meals,
      ingredients,
      prefs: {
        categoryOrder: (prefMap.get("category_order") as string[]) ?? DEFAULT_ORDER.slice(),
        overrides: (prefMap.get("overrides") as Record<string, string>) ?? {},
      },
      checks,
    };
  });
}
