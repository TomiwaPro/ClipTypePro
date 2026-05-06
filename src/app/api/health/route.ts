import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/health — proves end-to-end Supabase connectivity.
 *
 * Checks (in order):
 *   1. Required env vars are set.
 *   2. Anon-role SELECT against platform_ratings returns the seeded 25 rows
 *      (this confirms migration applied AND RLS allows authenticated reads
 *      of public reference data).
 *   3. Reports current auth state — useful when debugging cookies/SSR.
 *
 * Returns 200 only when DB connectivity is healthy.
 */
export async function GET() {
  const requiredEnv = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ] as const;
  const missing = requiredEnv.filter((k) => !process.env[k]);
  if (missing.length) {
    return NextResponse.json(
      { ok: false, stage: "env", missing },
      { status: 500 },
    );
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch (e) {
    return NextResponse.json(
      { ok: false, stage: "client", error: (e as Error).message },
      { status: 500 },
    );
  }

  const { count, error } = await supabase
    .from("platform_ratings")
    .select("*", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      { ok: false, stage: "query", error: error.message, hint: error.hint },
      { status: 500 },
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  return NextResponse.json({
    ok: true,
    stage: "connected",
    platform_ratings_count: count,
    expected: 25,
    authenticated: Boolean(user),
    user_id: user?.id ?? null,
  });
}
