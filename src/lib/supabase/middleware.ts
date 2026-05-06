import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresh the user's auth tokens from cookies on every request and return
 * (a) the response with refreshed cookies attached, and (b) the current user.
 *
 * Adapted from Supabase's reference SSR pattern. Critical: we must rebuild the
 * cookies on the response, not the request, otherwise the token refresh
 * doesn't survive the network hop.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not put any logic between createServerClient() and
  // getUser() — Supabase recommends getUser() runs first to refresh tokens.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
