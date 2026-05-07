import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordReferralFromCookie } from "@/lib/auth/referral";
import { claimTeamInviteFromCookie } from "@/lib/auth/team-invite";

/**
 * Auth callback route: handles
 *   (a) OAuth redirect (e.g. Google) — `?code=` exchanged for a session
 *   (b) Email confirmation — same `?code=` flow once user clicks link
 *   (c) Password reset — link from "reset password" email; lands here with
 *       a recovery code, then we route to /reset-password to let them set
 *       a new one
 *
 * Always lands on `?next=...` (or `/dashboard` if missing).
 *
 * Referral capture: if a ctp_ref cookie is set (placed by /ref/<code>),
 * record it as a referrals row pointing at the now-authenticated user.
 * The helper clears the cookie on first attempt so subsequent sign-ins
 * don't re-fire and silently swallows all errors so referral capture
 * cannot block the auth flow.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const failUrl = request.nextUrl.clone();
      failUrl.pathname = "/login";
      failUrl.search = `?error=${encodeURIComponent(error.message)}`;
      return NextResponse.redirect(failUrl);
    }
    if (data.user?.id && data.user.email) {
      await recordReferralFromCookie(data.user.id, data.user.email);
      await claimTeamInviteFromCookie(data.user.id, data.user.email);
    }
  }

  // Defend against open-redirect: only allow same-origin paths.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const target = request.nextUrl.clone();
  target.pathname = safeNext;
  target.search = "";
  return NextResponse.redirect(target);
}
