import { NextResponse } from "next/server";

/** Enveloppe commune : renvoie un message lisible au lieu d'une page d'erreur. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json((await fn()) ?? { ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue.";
    const missingDb = message.includes("DATABASE_URL");
    return NextResponse.json({ error: message }, { status: missingDb ? 503 : 500 });
  }
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Requête invalide.");
  }
}
