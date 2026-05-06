"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for the browser. Uses the anon key — RLS applies based
 * on the authenticated user's JWT, which @supabase/ssr keeps in cookies.
 *
 * Safe to call repeatedly; @supabase/ssr memoises internally.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
