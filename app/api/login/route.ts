import { NextResponse } from "next/server";
import { COOKIE_NAME, accessCode, hashCode, safeEqual } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = accessCode();
  if (!expected) {
    return NextResponse.json(
      { error: "Aucun code d'accès n'est configuré sur le serveur." },
      { status: 503 },
    );
  }
  let code = "";
  try {
    code = String(((await req.json()) as { code?: unknown }).code ?? "");
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!safeEqual(await hashCode(code), await hashCode(expected))) {
    return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, await hashCode(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
