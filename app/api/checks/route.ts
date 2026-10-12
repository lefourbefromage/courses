import { db, ensureSchema } from "@/lib/db";
import { body, handle } from "@/lib/api";
import { isValidWeekStart } from "@/lib/dates";
import type { Checks } from "@/lib/types";

/**
 * Cases cochées de la liste de courses. Elles sont communes aux appareils :
 * quand l'un met les tomates dans le caddie, l'autre le voit au battement
 * suivant. Une ligne = un article coché.
 */

function cleanKey(value: unknown): string {
  const key = String(value ?? "").trim();
  if (!key || key.length > 200) throw new Error("Article invalide.");
  return key;
}

/** Semaine en cours selon le navigateur : c'est son fuseau qui compte. */
function cleanWeek(value: unknown): string {
  const week = String(value ?? "");
  if (!isValidWeekStart(week)) throw new Error("Semaine invalide.");
  return week;
}

/** Ne garde que des couples unité -> nombre fini : le reste est écarté. */
function cleanTotals(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [unit, amount] of Object.entries(value as Record<string, unknown>)) {
    if (unit.length > 30) continue;
    const n = Number(amount);
    if (Number.isFinite(n)) out[unit] = n;
    if (Object.keys(out).length >= 20) break;
  }
  return out;
}

/** Coche un article. */
export async function POST(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const { key, totals, week } = await body<{ key: string; totals: unknown; week: string }>(req);
    const itemKey = cleanKey(key);
    const weekStart = cleanWeek(week);
    await db()`
      insert into checks (item_key, totals, week_start)
      values (${itemKey}, ${JSON.stringify(cleanTotals(totals))}::jsonb, ${weekStart})
      on conflict (item_key) do update
      set totals = excluded.totals, week_start = excluded.week_start, updated_at = now()`;
    return { ok: true };
  });
}

/**
 * Remplace d'un coup toute la liste des cases cochées. Utilisé par
 * « Resynchroniser », qui recalcule ce qui reste valable et en profite pour
 * effacer les articles qui ont quitté la liste.
 */
export async function PUT(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const { entries, week } = await body<{ entries: Checks; week: string }>(req);
    const weekStart = cleanWeek(week);
    const clean: [string, Record<string, number>][] = [];
    if (entries && typeof entries === "object" && !Array.isArray(entries)) {
      for (const [key, totals] of Object.entries(entries)) {
        const itemKey = String(key ?? "").trim();
        if (!itemKey || itemKey.length > 200) continue;
        clean.push([itemKey, cleanTotals(totals)]);
        if (clean.length >= 500) break;
      }
    }

    const sql = db();
    const keys = clean.map(([key]) => key);
    if (keys.length === 0) await sql`delete from checks`;
    else await sql`delete from checks where item_key <> all(${keys})`;
    for (const [key, totals] of clean) {
      await sql`
        insert into checks (item_key, totals, week_start)
        values (${key}, ${JSON.stringify(totals)}::jsonb, ${weekStart})
        on conflict (item_key) do update
        set totals = excluded.totals, week_start = excluded.week_start, updated_at = now()`;
    }
    return { ok: true };
  });
}

/** Décoche un article (`?key=`) ou vide toute la liste (`?all=1`). */
export async function DELETE(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const params = new URL(req.url).searchParams;
    if (params.get("all")) {
      await db()`delete from checks`;
      return { ok: true };
    }
    const key = cleanKey(params.get("key"));
    await db()`delete from checks where item_key = ${key}`;
    return { ok: true };
  });
}
