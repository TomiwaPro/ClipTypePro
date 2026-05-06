import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlobalSearch } from "@/components/dashboard/global-search";
import { Sidebar } from "@/components/dashboard/sidebar";
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
 * Loads the profile + unread notification count once, server-side, and
 * passes them as props to the client shell (sidebar, topbar). Avoids
 * double-fetching on each page navigation and keeps the data flow
 * unidirectional.
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

  // Profile + tier + trial deadline. Trigger ensures this row exists.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, tier, trial_ends_at, theme_preference")
    .eq("id", user.id)
    .single();

  // Unread notifs — count-only query, the partial index handles this fast.
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);

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

      <UpgradeModal />
      <GlobalSearch isFree={isFree} />
    </div>
  );
}
