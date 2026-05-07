import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimTeamInviteFromCookie } from "@/lib/auth/team-invite";

/**
 * Team-invite landing route. Two paths:
 *
 *   - User is already authenticated: set the cookie and immediately
 *     run the claim helper, then redirect to /dashboard/team. The
 *     helper validates that the auth user's email matches the invite
 *     before flipping status to active.
 *
 *   - User is anonymous: drop the invite id into an httpOnly cookie
 *     and bounce to /signup?invite=<id>. The signup flow consumes
 *     the cookie via signUpAction and /auth/callback.
 *
 * Both paths converge on claimTeamInviteFromCookie so there's only
 * one place where the email-match security check lives.
 */

const COOKIE_NAME = "ctp_invite";
const COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60; // 7 days — invites should be acted on quickly

type Params = Promise<{ id: string }>;

export async function GET(
  request: NextRequest,
  ctx: { params: Params },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const safe = (id ?? "").replace(/[^a-f0-9-]/gi, "").slice(0, 36);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && user.email) {
    // Logged-in path: set cookie so the helper can read it, then claim.
    const target = request.nextUrl.clone();
    target.pathname = "/dashboard/team";
    target.search = "";
    const res = NextResponse.redirect(target);
    res.cookies.set({
      name: COOKIE_NAME,
      value: safe,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60, // short-lived — claim runs immediately on the next request
      path: "/",
    });
    // Best-effort claim before redirect: cookies set on the response are
    // available on the same request via next/headers in route handlers,
    // so the helper can read it now.
    await claimTeamInviteFromCookie(user.id, user.email);
    return res;
  }

  // Anonymous path: store + bounce to signup.
  const target = request.nextUrl.clone();
  target.pathname = "/signup";
  target.search = safe ? `?invite=${encodeURIComponent(safe)}` : "";

  const res = NextResponse.redirect(target);
  if (safe) {
    res.cookies.set({
      name: COOKIE_NAME,
      value: safe,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE_S,
      path: "/",
    });
  }
  return res;
}
