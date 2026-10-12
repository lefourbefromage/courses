import { neon } from "@neondatabase/serverless";

function connectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    throw new Error(
      "Base de données non configurée : la variable DATABASE_URL est absente.",
    );
  }
  return url;
}

let client: ReturnType<typeof neon> | null = null;

export function db() {
  if (!client) client = neon(connectionString());
  return client;
}

let schemaReady: Promise<void> | null = null;

/** Crée les tables au premier appel : aucune migration à lancer à la main. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = db();
      await sql`
        create table if not exists weeks (
          id serial primary key,
          week_start date not null unique,
          created_at timestamptz not null default now()
        )`;
      await sql`
        create table if not exists meals (
          id serial primary key,
          week_id integer not null references weeks(id) on delete cascade,
          day smallint not null,
          slot text not null,
          title text not null default '',
          unique (week_id, day, slot)
        )`;
      // Repas « restes » : pointe vers le repas cuisiné, et n'a donc pas
      // d'ingrédients propres. Ajouté après coup, d'où le ALTER idempotent.
      await sql`
        alter table meals
        add column if not exists leftover_of integer
        references meals(id) on delete set null`;
      // Lien vers la recette (vidéo Instagram, YouTube, blog…).
      await sql`
        alter table meals
        add column if not exists link text not null default ''`;
      // Un ingrédient appartient soit à un repas, soit directement à la
      // semaine (les achats « hors menu » : sopalin, eau, chips…).
      await sql`
        create table if not exists ingredients (
          id serial primary key,
          meal_id integer references meals(id) on delete cascade,
          week_id integer references weeks(id) on delete cascade,
          name text not null,
          qty text not null default '',
          position integer not null default 0,
          created_at timestamptz not null default now(),
          constraint ingredients_owner check ((meal_id is null) <> (week_id is null))
        )`;
      // Qui édite quelle case, en ce moment. Les lignes sont éphémères :
      // un client absent depuis quelques secondes n'est plus affiché.
      await sql`
        create table if not exists presence (
          client_id text primary key,
          week_start date not null,
          day smallint,
          slot text,
          color smallint not null default 0,
          updated_at timestamptz not null default now()
        )`;
      // Cases cochées de la liste de courses, partagées entre les appareils :
      // une clé par article, avec les quantités au moment du cochage.
      await sql`
        create table if not exists checks (
          item_key text primary key,
          totals jsonb not null default '{}'::jsonb,
          updated_at timestamptz not null default now()
        )`;
      // Semaine du cochage : une case cochée ne vaut que pour la semaine en
      // cours, sinon les bières achetées lundi dernier resteraient cochées
      // quand on en remet cette semaine. Les lignes d'avant la colonne
      // prennent la semaine (heure de Paris) de leur dernier cochage.
      await sql`alter table checks add column if not exists week_start text`;
      await sql`
        update checks
        set week_start = to_char(date_trunc('week', updated_at at time zone 'Europe/Paris'), 'YYYY-MM-DD')
        where week_start is null`;
      await sql`
        create table if not exists prefs (
          key text primary key,
          value jsonb not null
        )`;
      await sql`create index if not exists ingredients_meal_idx on ingredients (meal_id)`;
      await sql`create index if not exists ingredients_week_idx on ingredients (week_id)`;
      await sql`create index if not exists meals_week_idx on meals (week_id)`;
      await sql`create index if not exists presence_week_idx on presence (week_start, updated_at)`;
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

/** Id d'une semaine si elle existe déjà, sans la créer. */
export async function findWeekId(weekStart: string): Promise<number | null> {
  const rows = (await db()`
    select id from weeks where week_start = ${weekStart}`) as { id: number }[];
  return rows.length ? rows[0].id : null;
}

/** Récupère l'id d'une semaine, en la créant si besoin. */
export async function weekId(weekStart: string): Promise<number> {
  const sql = db();
  const rows = (await sql`
    insert into weeks (week_start) values (${weekStart})
    on conflict (week_start) do update set week_start = excluded.week_start
    returning id`) as { id: number }[];
  return rows[0].id;
}
