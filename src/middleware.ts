import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Auth gating + session refresh for every request.
 *
 *   - Refreshes Supabase tokens via cookies (transparently extends sessions)
 *   - Sends unauthenticated users away from /dashboard/* and /app/* to /login
 *   - Sends authenticated users away from /login + /signup to /dashboard
 *
 * The matcher below excludes static assets and Next internals so the
 * middleware doesn't pay to refresh tokens on /favicon.ico etc.
 */

const PROTECTED_PREFIXES = ["/dashboard", "/app"] as const;
const AUTH_ONLY_PREFIXES = ["/login", "/signup"] as const;

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAuthOnly = AUTH_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Unauthenticated → bounce off protected pages back to /login
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Authenticated → don't let them sit on /login or /signup; send to dashboard
  if (isAuthOnly && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all paths EXCEPT static assets / images / Next internals.
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
