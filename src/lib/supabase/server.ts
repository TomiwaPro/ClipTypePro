import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for server contexts (Route Handlers, Server Actions,
 * Server Components). Reads auth from request cookies and refreshes
 * tokens automatically. Operates as the calling user — RLS applies.
 *
 * Do NOT use this for trusted server work (Stripe webhooks, cron) —
 * use createAdminClient() in ./admin.ts which uses the service role.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // setAll can be called from Server Components, where Next forbids
          // writing cookies. That's fine: middleware refreshes them on the
          // next request. Swallow the error.
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* noop */
          }
        },
      },
    },
  );
}
