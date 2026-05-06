import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/health — diagnostic probe for Supabase wiring.
 *
 * Walks setup in stages and bails at the first failure with structured info:
 *   1. env          — required environment variables present?
 *   2. url-shape    — does the URL look like a Supabase project URL?
 *   3. reachability — does the project answer at all over the network?
 *   4. client       — does the SSR client construct?
 *   5. query        — does an authenticated-or-anon SELECT work?
 *
 * On full success returns 200 with the seeded platform_ratings count.
 */
export async function GET() {
  // ── 1. ENV ────────────────────────────────────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !url && "NEXT_PUBLIC_SUPABASE_URL",
    !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean) as string[];

  if (missing.length) {
    return NextResponse.json(
      { ok: false, stage: "env", missing },
      { status: 500 },
    );
  }

  // ── 2. URL SHAPE ──────────────────────────────────────────────────────────
  // Catches the most common error: pasting the project name instead of the URL,
  // or accidentally including extra whitespace.
  const trimmedUrl = url!.trim();
  if (
    trimmedUrl !== url ||
    !trimmedUrl.startsWith("https://") ||
    !trimmedUrl.includes(".supabase.")
  ) {
    return NextResponse.json(
      {
        ok: false,
        stage: "url-shape",
        hint: "NEXT_PUBLIC_SUPABASE_URL must be the full https://<ref>.supabase.co URL with no whitespace",
        received_starts_with: url!.slice(0, 30),
        received_length: url!.length,
        had_whitespace: trimmedUrl !== url,
      },
      { status: 500 },
    );
  }

  // ── 3. REACHABILITY ───────────────────────────────────────────────────────
  // PostgREST root returns either 200 (with an OpenAPI-style payload) or 401
  // (no apikey). Either response means the project URL is alive. Anything
  // else (DNS failure, 404, 5xx) means env URL points somewhere wrong.
  try {
    const probe = await fetch(`${trimmedUrl}/rest/v1/`, {
      headers: { apikey: anonKey! },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (probe.status >= 500) {
      return NextResponse.json(
        {
          ok: false,
          stage: "reachability",
          status: probe.status,
          statusText: probe.statusText,
          hint: "Supabase project responded with a server error",
        },
        { status: 500 },
      );
    }
    if (probe.status === 404) {
      return NextResponse.json(
        {
          ok: false,
          stage: "reachability",
          status: 404,
          hint: "Project URL returned 404 — wrong project ref?",
        },
        { status: 500 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        stage: "network",
        error: (e as Error).message || "fetch failed",
        hint: "Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL is correct and the project isn't paused.",
      },
      { status: 500 },
    );
  }

  // ── 4. CLIENT ─────────────────────────────────────────────────────────────
  let supabase;
  try {
    supabase = await createClient();
  } catch (e) {
    return NextResponse.json(
      { ok: false, stage: "client", error: (e as Error).message },
      { status: 500 },
    );
  }

  // ── 5. QUERY ──────────────────────────────────────────────────────────────
  const { error, count, status, statusText } = await supabase
    .from("platform_ratings")
    .select("*", { count: "exact", head: true });

  if (error) {
    // Surface every available property — empty `message` happens when the
    // failure is a transport/auth shape rather than a SQL exception.

    // When anon fails with 401, also try the service-role key. That tells us
    // whether the project itself is healthy or specifically the anon key
    // is broken.
    let service_role_check: { ok: boolean; status?: number; message?: string } | null = null;
    if (status === 401 || !error.message) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        const { error: adminErr, status: adminStatus } = await admin
          .from("platform_ratings")
          .select("*", { count: "exact", head: true });
        service_role_check = {
          ok: !adminErr,
          status: adminStatus,
          message: adminErr?.message ?? undefined,
        };
      } catch (e) {
        service_role_check = { ok: false, message: (e as Error).message };
      }
    }

    // Raw HTTP probe — bypasses the supabase-js SDK and proves whether the
    // anon key string itself is rejected at the wire level.
    let raw_probe: {
      ok: boolean;
      status?: number;
      body_excerpt?: string;
      anon_key_first_30?: string;
      anon_key_last_10?: string;
      anon_key_length?: number;
      url?: string;
    } | null = null;
    if (status === 401 || !error.message) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      try {
        const res = await fetch(
          `${url}/rest/v1/platform_ratings?select=name&limit=1`,
          {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
            },
            cache: "no-store",
            signal: AbortSignal.timeout(5_000),
          },
        );
        const text = await res.text();
        raw_probe = {
          ok: res.ok,
          status: res.status,
          body_excerpt: text.slice(0, 200),
          // Echo prefix so user can visually verify .env.local matches dashboard.
          // Public information — JWT header bytes are non-secret.
          anon_key_first_30: anonKey.slice(0, 30),
          anon_key_last_10: anonKey.slice(-10),
          anon_key_length: anonKey.length,
          url,
        };
      } catch (e) {
        raw_probe = {
          ok: false,
          body_excerpt: `fetch error: ${(e as Error).message}`,
          anon_key_first_30: anonKey.slice(0, 30),
          anon_key_last_10: anonKey.slice(-10),
          anon_key_length: anonKey.length,
          url,
        };
      }
    }

    const cause401 =
      status === 401
        ? service_role_check?.ok
          ? "Project is healthy, but NEXT_PUBLIC_SUPABASE_ANON_KEY is wrong/truncated/swapped. Re-copy the 'anon public' key from Supabase → Project Settings → API."
          : service_role_check && !service_role_check.ok
            ? "Both keys rejected — project may be paused, deleted, or API rotated. Check the dashboard."
            : null
        : null;

    return NextResponse.json(
      {
        ok: false,
        stage: "query",
        message: error.message || null,
        code: (error as { code?: string }).code ?? null,
        details: (error as { details?: string }).details ?? null,
        hint: (error as { hint?: string }).hint ?? null,
        http_status: status,
        http_status_text: statusText,
        service_role_check,
        raw_probe,
        likely_cause:
          cause401 ??
          ((error as { code?: string }).code === "PGRST301"
            ? "Auth required (RLS) — anon role can't read platform_ratings if you re-keyed the project"
            : (error as { code?: string }).code === "42P01"
              ? "Migration 001 hasn't been applied to this project yet"
              : (error as { code?: string }).code === "42501"
                ? "Authenticated role lacks SELECT — base GRANT may not have been applied"
                : !error.message
                  ? "Empty error often means the anon key is wrong, project is paused, or the API was rotated"
                  : null),
      },
      { status: 500 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({
    ok: true,
    stage: "connected",
    platform_ratings_count: count,
    expected: 25,
    authenticated: Boolean(user),
    user_id: user?.id ?? null,
  });
}
