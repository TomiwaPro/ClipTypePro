import { NextResponse, type NextRequest } from "next/server";

/**
 * Public referral landing — visitors hitting /ref/<code> get the code
 * stored in an httpOnly cookie, then bounce to /signup?ref=<code>.
 *
 * Why a cookie (not just a query param): Google OAuth signups don't
 * carry the query string through Google's flow back to /auth/callback.
 * A cookie survives the round-trip and is read after auth completes.
 *
 * Sanitises the code to base-36 so a crafted URL can't smuggle path
 * fragments or shell-special chars into the cookie value.
 */

const COOKIE_NAME = "ctp_ref";
const COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60; // 30 days

type Params = Promise<{ code: string }>;

export async function GET(
  request: NextRequest,
  ctx: { params: Params },
): Promise<NextResponse> {
  const { code } = await ctx.params;
  const safe = (code ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 32);

  const target = request.nextUrl.clone();
  target.pathname = "/signup";
  target.search = safe ? `?ref=${encodeURIComponent(safe)}` : "";

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
