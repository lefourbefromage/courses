import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, accessCode, hashCode, safeEqual } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login", "/manifest.webmanifest", "/icon.svg"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p)) return NextResponse.next();

  const code = accessCode();
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const ok = code !== null && cookie !== undefined && safeEqual(cookie, await hashCode(code));
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
