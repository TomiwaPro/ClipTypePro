import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AnalyticsClient,
  type SessionRow,
  type TopSnippet,
} from "@/components/dashboard/analytics/analytics-client";

export const dynamic = "force-dynamic";

type SP = Promise<{ range?: string }>;

const ALLOWED_RANGES = ["7d", "30d", "90d"] as const;
type Range = (typeof ALLOWED_RANGES)[number];

const RANGE_DAYS: Record<Range, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/**
 * Analytics page — KPIs, WPM-over-time, daily activity, top snippets.
 *
 * Range filter (7d / 30d / 90d) is encoded in the URL, so the server
 * query is the source of truth. RLS scopes both queries to auth.uid().
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const range: Range = ALLOWED_RANGES.includes(sp.range as Range)
    ? (sp.range as Range)
    : "7d";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sinceIso = new Date(
    // Server components render once per request; lint's purity rule is
    // over-broad here (same exemption as dashboard/layout.tsx).
    // eslint-disable-next-line react-hooks/purity
    Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [{ data: sessionsData, error: sessionsErr }, { data: snippetsData }] =
    await Promise.all([
      supabase
        .from("typing_sessions")
        .select("char_count, word_count, avg_wpm, duration_seconds, created_at")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true })
        .limit(2000),
      supabase
        .from("snippets")
        .select("id, title, category, use_count")
        .order("use_count", { ascending: false })
        .limit(5),
    ]);

  if (sessionsErr) {
    return (
      <div
        className="fade-up"
        style={{
          maxWidth: 600,
          background: "var(--c-surface)",
          border:
            "1px solid color-mix(in srgb, var(--c-danger) 33%, transparent)",
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
          Could not load analytics
        </div>
        <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
          {sessionsErr.message}
        </div>
      </div>
    );
  }

  const sessions: SessionRow[] = (sessionsData ?? []).map((r) => ({
    charCount: (r.char_count as number | null) ?? 0,
    wordCount: (r.word_count as number | null) ?? 0,
    avgWpm: (r.avg_wpm as number | null) ?? 0,
    durationSeconds: (r.duration_seconds as number | null) ?? 0,
    createdAt: r.created_at as string,
  }));

  const topSnippets: TopSnippet[] = (snippetsData ?? [])
    .filter((s) => ((s.use_count as number | null) ?? 0) > 0)
    .map((s) => ({
      id: s.id as string,
      title: s.title as string,
      category: s.category as string,
      useCount: (s.use_count as number | null) ?? 0,
    }));

  return (
    <AnalyticsClient
      range={range}
      sessions={sessions}
      topSnippets={topSnippets}
      rangeDays={RANGE_DAYS[range]}
    />
  );
}
