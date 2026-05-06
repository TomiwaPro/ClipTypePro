import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback route: handles
 *   (a) OAuth redirect (e.g. Google) — `?code=` exchanged for a session
 *   (b) Email confirmation — same `?code=` flow once user clicks link
 *   (c) Password reset — link from "reset password" email; lands here with
 *       a recovery code, then we route to /reset-password to let them set
 *       a new one
 *
 * Always lands on `?next=...` (or `/dashboard` if missing).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const failUrl = request.nextUrl.clone();
      failUrl.pathname = "/login";
      failUrl.search = `?error=${encodeURIComponent(error.message)}`;
      return NextResponse.redirect(failUrl);
    }
  }

  // Defend against open-redirect: only allow same-origin paths.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const target = request.nextUrl.clone();
  target.pathname = safeNext;
  target.search = "";
  return NextResponse.redirect(target);
}
