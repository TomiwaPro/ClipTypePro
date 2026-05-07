import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  type ApiKeyRow,
  ApiClient,
} from "@/components/dashboard/api/api-client";
import { StubPage } from "@/components/dashboard/stub-page";

export const dynamic = "force-dynamic";

/**
 * API Portal — list active keys, generate / rotate / revoke them.
 *
 * Pro-locked: free users see the upgrade panel (StubPage's proLocked
 * UI). Pro / Teams / Enterprise see the real page.
 *
 * Active keys only — once revoked, a key disappears from the list.
 * key_prefix is safe to display (sha-256 of the full key is what we
 * actually verify against on incoming requests).
 */
export default async function ApiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();
  const tier = (profile?.tier ?? "free") as
    | "free"
    | "pro"
    | "teams"
    | "enterprise";

  if (tier === "free") {
    return (
      <StubPage
        title="API Portal"
        subtitle="Integrate ClipType's typing engine into your products"
        comingIn="Pro plan"
        proLocked
        isFree
        bullets={[
          "Generate / revoke API keys (sha-256 hashed at rest)",
          "Quick-start curl + JS snippets",
          "Usage counters tracked via api_keys.last_used_at",
          "Rotate keys instantly without downtime",
        ]}
      />
    );
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, key_prefix, label, last_used_at, created_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

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
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
          Could not load API keys
        </div>
        <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
          {error.message}
        </div>
      </div>
    );
  }

  const keys: ApiKeyRow[] = (data ?? []).map((r) => ({
    id: r.id as string,
    prefix: r.key_prefix as string,
    label: (r.label as string | null) ?? null,
    lastUsedAt: (r.last_used_at as string | null) ?? null,
    createdAt: r.created_at as string,
  }));

  return <ApiClient initial={keys} />;
}
