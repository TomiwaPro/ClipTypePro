import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Claim a pending team_members row for a freshly-authenticated user.
 *
 * Mirrors the referral capture pattern:
 *   1. /api/invite/<id> sets the ctp_invite cookie before bouncing to
 *      signup (or claims immediately if already logged in)
 *   2. After signUp / OAuth callback, this helper reads the cookie,
 *      looks up the team_members row, validates the email matches
 *      what was invited, and flips status to active
 *
 * Service-role on purpose:
 *   - reading the team_members row by id without being a current
 *     member of the team isn't permitted by RLS yet
 *   - the email match check is the security boundary, not RLS
 *
 * Always best-effort: a bad / expired / wrong-email invite simply
 * doesn't get claimed; the user still completes signup normally.
 */
export async function claimTeamInviteFromCookie(
  newUserId: string,
  newUserEmail: string,
): Promise<void> {
  const COOKIE_NAME = "ctp_invite";

  let inviteId: string | undefined;
  try {
    const jar = await cookies();
    inviteId = jar.get(COOKIE_NAME)?.value;
    if (!inviteId) return;
    jar.delete(COOKIE_NAME);
  } catch {
    return;
  }

  if (!newUserEmail) return;

  // UUID shape check before hitting the DB — guards against a crafted
  // cookie causing a wide-open scan.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      inviteId,
    )
  ) {
    return;
  }

  try {
    const admin = createAdminClient();
    const { data: row } = await admin
      .from("team_members")
      .select("id, invited_email, status, team_id")
      .eq("id", inviteId)
      .maybeSingle();
    if (!row || row.status !== "invited") return;

    const inviteEmail = (row.invited_email as string | null) ?? "";
    if (inviteEmail.toLowerCase() !== newUserEmail.toLowerCase()) return;

    // Make sure this user isn't already a member of the team via a
    // different row (e.g. they were re-invited after leaving). The
    // unique (team_id, user_id) constraint would otherwise fail the
    // update; cleaner to detect and skip.
    const { data: dup } = await admin
      .from("team_members")
      .select("id")
      .eq("team_id", row.team_id as string)
      .eq("user_id", newUserId)
      .maybeSingle();
    if (dup) {
      // Drop the dangling invite row to avoid orphan invites lingering.
      await admin.from("team_members").delete().eq("id", row.id);
      return;
    }

    await admin
      .from("team_members")
      .update({
        user_id: newUserId,
        status: "active",
        joined_at: new Date().toISOString(),
        invited_email: null,
      })
      .eq("id", row.id);
  } catch (e) {
    console.warn(
      "[team-invite] claim threw (non-fatal):",
      (e as Error).message,
    );
  }
}
