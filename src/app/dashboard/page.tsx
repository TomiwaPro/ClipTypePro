import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/auth/actions";

/**
 * Placeholder dashboard. Step 4+ replaces this with the real app shell from
 * the v4 prototype. For now it confirms the auth round-trip end-to-end:
 *   - middleware bounced unauthenticated visitors to /login
 *   - we land here with a real user
 *   - sign-out wipes the session and bounces back to /login
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defence in depth — middleware should have redirected, but if a request
  // somehow lands here without a session, send to login.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tier, trial_ends_at, theme_preference")
    .eq("id", user.id)
    .single();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-sans)",
        padding: 40,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          <span style={{ color: "var(--c-primary)" }}>Clip</span>
          <span style={{ color: "var(--c-text)" }}>Type</span>
          <span style={{ color: "var(--c-accent)" }}>Pro</span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          You&apos;re signed in 🎉
        </h1>
        <p
          style={{ color: "var(--c-text-dim)", fontSize: 14, marginBottom: 24 }}
        >
          The real dashboard ports in next. For now this proves auth works.
        </p>

        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            padding: 18,
            marginBottom: 18,
            display: "grid",
            gap: 8,
            fontSize: 13,
          }}
        >
          <Row label="User ID" value={user.id} mono />
          <Row label="Email" value={user.email ?? "—"} />
          <Row label="Full name" value={profile?.full_name ?? "—"} />
          <Row label="Tier" value={profile?.tier ?? "—"} />
          <Row
            label="Trial ends"
            value={
              profile?.trial_ends_at
                ? new Date(profile.trial_ends_at).toLocaleString()
                : "—"
            }
          />
          <Row label="Theme preference" value={profile?.theme_preference ?? "—"} />
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              background:
                "color-mix(in srgb, var(--c-danger) 18%, transparent)",
              color: "var(--c-danger)",
              border:
                "1px solid color-mix(in srgb, var(--c-danger) 40%, transparent)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div
        style={{
          width: 130,
          color: "var(--c-text-muted)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 1.2,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
          fontSize: 12,
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
    </div>
  );
}
