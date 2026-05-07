import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BfcacheReload } from "@/components/dashboard/bfcache-reload";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { MobileBackdrop } from "@/components/dashboard/mobile-backdrop";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThemeSeed } from "@/components/dashboard/theme-seed";
import { Topbar } from "@/components/dashboard/topbar";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";

// Authenticated pages must never be cached: prevents browser back from
// showing a stale dashboard after sign-out, and ensures every navigation
// re-checks the session via middleware.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Tier = "free" | "pro" | "teams" | "enterprise";

/**
 * Shared layout for every page under /dashboard.
 *
 * Loads the profile + unread notification count + content for the global
 * search palette (platform list, user's snippet titles) once, server-side,
 * and passes them to the client shell. Avoids double-fetching on each
 * page navigation and keeps the data flow unidirectional.
 *
 * Defence in depth: middleware should have redirected unauthenticated
 * traffic away, but if we somehow land here without a user, redirect to
 * /login rather than crashing on `null`.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch everything the shell needs in parallel.
  const [
    { data: profile },
    { count: unreadCount },
    { data: platforms },
    { data: snippets },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, tier, trial_ends_at, theme_preference")
      .eq("id", user.id)
      .single(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
    // Public reference data — RLS allows anon SELECT (migration 003).
    supabase
      .from("platform_ratings")
      .select("name, category, risk_level")
      .order("name"),
    // RLS already restricts to user's own snippets.
    supabase
      .from("snippets")
      .select("id, title, category")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const tier = (profile?.tier ?? "free") as Tier;
  const isFree = tier === "free";

  // Days remaining in trial (only meaningful on free tier, but the
  // sidebar shows it for non-free too so we compute it always).
  // Server components run once per request — Date.now() is deterministic
  // within a render and the react-hooks/purity rule is over-broad here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.trial_ends_at).getTime() - now) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : null;

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-sans)",
        overflow: "hidden",
      }}
    >
      <Sidebar
        tier={tier}
        unreadCount={unreadCount ?? 0}
        trialDaysLeft={trialDaysLeft}
      />

      <MobileBackdrop />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Topbar
          fullName={profile?.full_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
          email={user.email ?? ""}
          tier={tier}
        />
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px 28px",
          }}
        >
          {children}
        </main>
      </div>

      <BfcacheReload />
      <ThemeSeed
        serverTheme={
          (profile?.theme_preference as "dark" | "light" | null) ?? "dark"
        }
      />
      <UpgradeModal />
      <GlobalSearch
        isFree={isFree}
        platforms={
          (platforms ?? []).map((p) => ({
            name: p.name as string,
            category: p.category as string,
            riskLevel: p.risk_level as "green" | "yellow" | "red",
          }))
        }
        snippets={
          (snippets ?? []).map((s) => ({
            id: s.id as string,
            title: s.title as string,
            category: s.category as string,
          }))
        }
      />
    </div>
  );
}
