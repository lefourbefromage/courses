import { db, ensureSchema } from "@/lib/db";
import { body, handle } from "@/lib/api";
import { isCategoryId } from "@/lib/categories";

export async function PUT(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const { categoryOrder, overrides } = await body<{
      categoryOrder?: string[];
      overrides?: Record<string, string>;
    }>(req);
    const sql = db();

    if (Array.isArray(categoryOrder)) {
      const clean = categoryOrder.filter(isCategoryId);
      await sql`
        insert into prefs (key, value) values ('category_order', ${JSON.stringify(clean)}::jsonb)
        on conflict (key) do update set value = excluded.value`;
    }
    if (overrides && typeof overrides === "object") {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(overrides)) {
        if (typeof v === "string" && isCategoryId(v)) clean[k] = v;
      }
      await sql`
        insert into prefs (key, value) values ('overrides', ${JSON.stringify(clean)}::jsonb)
        on conflict (key) do update set value = excluded.value`;
    }
    return { ok: true };
  });
}
