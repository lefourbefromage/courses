export const COOKIE_NAME = "courses_auth";

/** Empreinte du code d'accès : c'est elle qui est stockée dans le cookie. */
export async function hashCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(`courses::${code.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function accessCode(): string | null {
  const code = process.env.APP_ACCESS_CODE;
  return code && code.trim() ? code.trim() : null;
}

/** Comparaison à temps constant, pour ne pas fuir le code par la durée. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
