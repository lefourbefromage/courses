import { db, ensureSchema } from "@/lib/db";
import { body, handle } from "@/lib/api";
import { isValidWeekStart } from "@/lib/dates";

/** Au-delà de ce délai sans battement, un client n'est plus considéré présent. */
const ALIVE_SECONDS = 12;

type Payload = {
  clientId: string;
  weekStart: string;
  /** null = présent sur la semaine, mais dans aucune case. */
  day: number | null;
  slot: string | null;
  color: number;
};

export const dynamic = "force-dynamic";

/**
 * Un seul aller-retour : on signale où l'on est, et on récupère où sont les
 * autres. Appelé toutes les 3 secondes par les onglets ouverts.
 */
export async function POST(req: Request) {
  return handle(async () => {
    await ensureSchema();
    const { clientId, weekStart, day, slot, color } = await body<Payload>(req);

    if (typeof clientId !== "string" || !/^[a-z0-9-]{8,64}$/i.test(clientId)) {
      throw new Error("Identifiant client invalide.");
    }
    if (!isValidWeekStart(weekStart)) throw new Error("Semaine invalide.");

    const cellDay = Number.isInteger(day) && day !== null && day >= 0 && day <= 6 ? day : null;
    const cellSlot = slot === "midi" || slot === "soir" ? slot : null;
    const hue = Number.isInteger(color) ? Math.abs(color) % 6 : 0;

    const sql = db();
    await sql`
      insert into presence (client_id, week_start, day, slot, color, updated_at)
      values (${clientId}, ${weekStart}, ${cellDay}, ${cellSlot}, ${hue}, now())
      on conflict (client_id) do update
        set week_start = excluded.week_start,
            day = excluded.day,
            slot = excluded.slot,
            color = excluded.color,
            updated_at = now()`;

    // Purge légère : les vieilles lignes ne servent plus à rien.
    await sql`delete from presence where updated_at < now() - interval '5 minutes'`;

    const peers = (await sql`
      select client_id, day, slot, color from presence
      where week_start = ${weekStart}
        and client_id <> ${clientId}
        and updated_at > now() - (${ALIVE_SECONDS} || ' seconds')::interval`) as {
      client_id: string;
      day: number | null;
      slot: string | null;
      color: number;
    }[];

    return {
      peers: peers.map((p) => ({
        clientId: p.client_id,
        day: p.day,
        slot: p.slot === "soir" ? "soir" : p.slot === "midi" ? "midi" : null,
        color: p.color,
      })),
    };
  });
}
