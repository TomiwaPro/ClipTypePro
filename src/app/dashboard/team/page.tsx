import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasProAccess } from "@/lib/dashboard/access";
import {
  type SessionRow,
  TeamClient,
  type TeamMemberRow,
} from "@/components/dashboard/team/team-client";
import { StubPage } from "@/components/dashboard/stub-page";

export const dynamic = "force-dynamic";

/**
 * Team page — members, usage chart, audit log.
 *
 * Pro-locked. Uses service-role for the cross-member profile fetch
 * because RLS on profiles scopes to own row only — adding a "team
 * members can read each other's profiles" policy is a separate
 * change. We've already authenticated the actor and confirmed they're
 * in the team, so the elevated read is bounded.
 */
export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, trial_ends_at, subscription_status")
    .eq("id", user.id)
    .single();

  if (!hasProAccess(profile ?? {})) {
    return (
      <StubPage
        title="Team Management"
        subtitle="Manage members, roles, and shared snippets"
        comingIn="Pro plan"
        proLocked
        isFree
        bullets={[
          "Invite by email (with role: admin / member / viewer)",
          "Per-member sessions, characters typed, last active",
          "Shared snippet library (powered by team_members RLS)",
          "Audit log export",
        ]}
      />
    );
  }

  // Find this user's primary team (first active membership, newest first).
  const { data: myMembership } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const teamId = (myMembership?.team_id as string | null) ?? null;
  const myRole =
    (myMembership?.role as "admin" | "member" | "viewer" | null) ?? null;

  if (!teamId) {
    return (
      <div className="fade-up" style={{ display: "grid", gap: 14, maxWidth: 600 }}>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Team Management
        </h1>
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 26, marginBottom: 10 }}>👥</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            You&rsquo;re not in a team yet
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--c-text-dim)",
              maxWidth: 360,
              margin: "0 auto",
              lineHeight: 1.55,
            }}
          >
            If you&rsquo;re on the Teams plan, your admin can invite you here.
            Otherwise, contact{" "}
            <a
              href="mailto:support@cliptypepro.com"
              style={{ color: "var(--c-primary)" }}
            >
              support
            </a>
            {" "}to set up a team.
          </div>
        </div>
      </div>
    );
  }

  // Service-role fetch: team metadata, members joined with profiles,
  // and recent typing sessions for the team's user_ids.
  const admin = createAdminClient();

  const [{ data: team }, { data: memberRows }] = await Promise.all([
    admin
      .from("teams")
      .select("id, name, plan, owner_id")
      .eq("id", teamId)
      .single(),
    admin
      .from("team_members")
      .select("id, team_id, user_id, role, status, invited_email, joined_at, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true }),
  ]);

  const memberUserIds = (memberRows ?? [])
    .map((m) => m.user_id as string | null)
    .filter((x): x is string => Boolean(x));

  const [{ data: profiles }, { count: sessionsCountAll }, { data: recentSessions }] =
    await Promise.all([
      memberUserIds.length > 0
        ? admin
            .from("profiles")
            .select("id, full_name, email")
            .in("id", memberUserIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string }> }),
      memberUserIds.length > 0
        ? admin
            .from("typing_sessions")
            .select("id", { count: "exact", head: true })
            .in("user_id", memberUserIds)
        : Promise.resolve({ count: 0 }),
      memberUserIds.length > 0
        ? admin
            .from("typing_sessions")
            .select("id, user_id, char_count, avg_wpm, target_app, duration_seconds, created_at")
            .in("user_id", memberUserIds)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as Array<{ id: string; user_id: string; char_count: number; avg_wpm: number; target_app: string | null; duration_seconds: number; created_at: string }> }),
    ]);
  void sessionsCountAll; // available if you want a top-line count later

  // Per-user char count for the usage chart.
  const { data: charSums } =
    memberUserIds.length > 0
      ? await admin
          .from("typing_sessions")
          .select("user_id, char_count")
          .in("user_id", memberUserIds)
          .limit(5000)
      : { data: [] as Array<{ user_id: string; char_count: number }> };

  const charsByUser: Record<string, number> = {};
  for (const r of charSums ?? []) {
    const uid = r.user_id as string;
    charsByUser[uid] =
      (charsByUser[uid] ?? 0) + ((r.char_count as number | null) ?? 0);
  }

  const profileById: Record<
    string,
    { fullName: string | null; email: string }
  > = {};
  for (const p of profiles ?? []) {
    profileById[p.id as string] = {
      fullName: (p.full_name as string | null) ?? null,
      email: p.email as string,
    };
  }

  const sessionCountByUser: Record<string, number> = {};
  for (const r of recentSessions ?? []) {
    const uid = r.user_id as string;
    sessionCountByUser[uid] = (sessionCountByUser[uid] ?? 0) + 1;
  }
  // The above only counts the recent slice; for a more accurate per-member
  // count, run another aggregate. Keep it simple: include the recent slice
  // count as "active recently" rather than the all-time number.

  const members: TeamMemberRow[] = (memberRows ?? []).map((m) => {
    const uid = m.user_id as string | null;
    const p = uid ? profileById[uid] : undefined;
    return {
      id: m.id as string,
      userId: uid,
      role: m.role as "admin" | "member" | "viewer",
      status: m.status as "active" | "invited",
      email: p?.email ?? (m.invited_email as string | null) ?? "",
      fullName: p?.fullName ?? null,
      joinedAt: (m.joined_at as string | null) ?? null,
      charsTyped: uid ? (charsByUser[uid] ?? 0) : 0,
      recentSessionCount: uid ? (sessionCountByUser[uid] ?? 0) : 0,
    };
  });

  const sessions: SessionRow[] = (recentSessions ?? []).map((r) => {
    const uid = r.user_id as string;
    const p = profileById[uid];
    return {
      id: r.id as string,
      userId: uid,
      userDisplay: p?.fullName || p?.email || "Unknown",
      charCount: (r.char_count as number | null) ?? 0,
      avgWpm: (r.avg_wpm as number | null) ?? 0,
      targetApp: (r.target_app as string | null) ?? null,
      durationSeconds: (r.duration_seconds as number | null) ?? 0,
      createdAt: r.created_at as string,
    };
  });

  const ownerId = (team?.owner_id as string | null) ?? null;
  const isAdmin = myRole === "admin" || ownerId === user.id;

  return (
    <TeamClient
      teamId={teamId}
      teamName={(team?.name as string | null) ?? "Your team"}
      currentUserId={user.id}
      isAdmin={isAdmin}
      members={members}
      sessions={sessions}
    />
  );
}
