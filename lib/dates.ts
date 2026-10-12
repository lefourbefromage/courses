/** Dates manipulées en "YYYY-MM-DD" pour éviter tout décalage de fuseau. */

export const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;
export const SLOTS = [
  { id: "midi", label: "Midi" },
  { id: "soir", label: "Soir" },
] as const;
export type SlotId = (typeof SLOTS)[number]["id"];

function toUTC(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Lundi de la semaine en cours. */
export function currentWeekStart(): string {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dow = (utc.getUTCDay() + 6) % 7; // 0 = lundi
  utc.setUTCDate(utc.getUTCDate() - dow);
  return toISO(utc);
}

export function addWeeks(weekStart: string, n: number): string {
  const d = toUTC(weekStart);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return toISO(d);
}

export function dayDate(weekStart: string, dayIndex: number): string {
  const d = toUTC(weekStart);
  d.setUTCDate(d.getUTCDate() + dayIndex);
  return toISO(d);
}

export function isValidWeekStart(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(toUTC(iso).getTime());
}

const shortFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "UTC" });

/** "8 – 14 sept." */
export function weekLabel(weekStart: string): string {
  const start = toUTC(weekStart);
  const end = toUTC(addWeeks(weekStart, 1));
  end.setUTCDate(end.getUTCDate() - 1);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return sameMonth
    ? `${dayFmt.format(start)} – ${shortFmt.format(end)}`
    : `${shortFmt.format(start)} – ${shortFmt.format(end)}`;
}

/** "8 sept." pour l'en-tête d'un jour. */
export function dayLabel(weekStart: string, dayIndex: number): string {
  return shortFmt.format(toUTC(dayDate(weekStart, dayIndex)));
}

const longFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });

/** "Semaine du 8 septembre", pour titrer un groupe de repas. */
export function weekTitle(weekStart: string): string {
  return `Semaine du ${longFmt.format(toUTC(weekStart))}`;
}

/** "en cours", "à venir" ou "passée" — situe une semaine par rapport à aujourd'hui. */
export function weekWhen(weekStart: string, reference = currentWeekStart()): "cours" | "venir" | "passee" {
  if (weekStart === reference) return "cours";
  return weekStart > reference ? "venir" : "passee";
}
