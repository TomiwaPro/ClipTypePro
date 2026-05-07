import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlatformsClient } from "@/components/dashboard/platforms/platforms-client";

export const dynamic = "force-dynamic";

/**
 * Platform risk ratings — the seeded reference list. RLS allows anon
 * select on this table (migration 003) so we don't need elevated perms.
 *
 * Load once on the server and hand to the client for filter/search.
 * This list is small (~25 rows) and updates rarely; in-memory filter
 * is simpler and faster than round-tripping each keystroke.
 */
export default async function PlatformsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("platform_ratings")
    .select("id, name, category, risk_level, notes")
    .order("name", { ascending: true });

  if (error) {
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
          color: "var(--c-text)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
          Could not load platforms
        </div>
        <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
          {error.message}
        </div>
      </div>
    );
  }

  return (
    <PlatformsClient
      platforms={(data ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        category: r.category as string,
        riskLevel: r.risk_level as "green" | "yellow" | "red",
        notes: (r.notes as string | null) ?? null,
      }))}
    />
  );
}
