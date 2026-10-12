/**
 * Normalise un lien de recette saisi à la main.
 * Renvoie null si ce n'est pas une adresse web utilisable : on n'accepte que
 * http et https, pour qu'un lien collé ne puisse pas exécuter de code.
 */
export function normalizeLink(raw: string): string | null {
  const text = raw.trim();
  if (!text) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname.includes(".")) return null;
  return url.toString();
}

/** "instagram.com" — pour afficher la source d'un lien sans l'étaler. */
export function linkHost(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}
