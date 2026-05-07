"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

/**
 * Server actions for /dashboard/team.
 *
 * All mutations require the caller to be an admin of the target team.
 * RLS policies enforce that team_members.update / .delete only succeed
 * for admins of the same team — but we still revalidate the actor's
 * admin status server-side before doing any work, so we can return a
 * useful error rather than relying on a silent zero-row update.
 *
 * Invite flow:
 *   1. Insert team_members row (status=invited, invited_email, role)
 *   2. Email the address with a link /api/invite/<row.id>
 *   3. Recipient hits the link:
 *      - already logged in -> claim immediately and bounce to dashboard
 *      - not logged in     -> cookie set, bounce to /signup?invite=<id>
 *      Both paths converge on claimTeamInviteFromCookie which verifies
 *      the row's invited_email matches the new user's email before
 *      attaching user_id and flipping status to active.
 */

async function isAdminOfTeam(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (data?.role === "admin") return true;
  const { data: team } = await supabase
    .from("teams")
    .select("owner_id")
    .eq("id", teamId)
    .maybeSingle();
  return team?.owner_id === userId;
}

const inviteSchema = z.object({
  teamId: z.string().uuid(),
  email: z.string().trim().email("Enter a valid email").max(255),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export async function inviteTeamMemberAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (!(await isAdminOfTeam(supabase, parsed.data.teamId, user.id))) {
    return { ok: false, error: "Only team admins can invite" };
  }

  // Reject duplicates with a clearer message than the unique-constraint
  // error that would otherwise bubble up from the DB.
  const { data: existing } = await supabase
    .from("team_members")
    .select("id, status")
    .eq("team_id", parsed.data.teamId)
    .ilike("invited_email", parsed.data.email)
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error:
        existing.status === "active"
          ? "That email is already an active member of this team."
          : "That email already has a pending invite. Resend from their row.",
    };
  }

  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("id", parsed.data.teamId)
    .single();
  const teamName = (team?.name as string | null) ?? "your team";

  const { data: inserted, error: insertErr } = await supabase
    .from("team_members")
    .insert({
      team_id: parsed.data.teamId,
      invited_email: parsed.data.email,
      role: parsed.data.role,
      status: "invited",
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    return {
      ok: false,
      error: insertErr?.message ?? "Couldn't create invite",
    };
  }

  // Build the invite link. The /api/invite/<id> route claims the row
  // for an authenticated user or sets a cookie + bounces to signup.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
    "http://localhost:3000";
  const link = `${appUrl}/api/invite/${inserted.id}`;

  const subject = `You're invited to join ${teamName} on ClipType Pro`;
  const text = `You've been invited to join ${teamName} on ClipType Pro.

Accept the invite:
${link}

If you weren't expecting this, you can safely ignore this email.`;
  const html = `
    <p>You've been invited to join <strong>${escapeHtml(teamName)}</strong> on ClipType Pro.</p>
    <p>
      <a href="${link}" style="display:inline-block;padding:10px 16px;background:#22d3ee;color:#000;text-decoration:none;border-radius:7px;font-weight:700">Accept invite</a>
    </p>
    <p style="color:#666;font-size:12px">If you weren't expecting this, you can safely ignore this email.</p>
  `;

  const send = await sendEmail({
    to: parsed.data.email,
    subject,
    text,
    html,
    replyTo: user.email ?? undefined,
  });
  if (!send.ok) {
    // Roll the row back so a stale invite isn't left dangling without
    // an email having gone out.
    await supabase.from("team_members").delete().eq("id", inserted.id);
    return { ok: false, error: `Couldn't send invite email: ${send.error}` };
  }

  revalidatePath("/dashboard/team");
  return { ok: true };
}

const roleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["admin", "member", "viewer"]),
});

export async function updateTeamMemberRoleAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = roleSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid role" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Look up the row first to figure out which team it belongs to —
  // RLS scopes to the current team so this is a single read.
  const { data: row } = await supabase
    .from("team_members")
    .select("id, team_id, user_id")
    .eq("id", parsed.data.memberId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Member not found" };

  if (!(await isAdminOfTeam(supabase, row.team_id as string, user.id))) {
    return { ok: false, error: "Only team admins can change roles" };
  }

  const { error } = await supabase
    .from("team_members")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.memberId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  return { ok: true };
}

const removeSchema = z.object({ memberId: z.string().uuid() });

export async function removeTeamMemberAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = removeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: row } = await supabase
    .from("team_members")
    .select("id, team_id, user_id")
    .eq("id", parsed.data.memberId)
    .maybeSingle();
  if (!row) return { ok: false, error: "Member not found" };
  if ((row.user_id as string | null) === user.id) {
    return {
      ok: false,
      error: "Use 'Leave team' to remove yourself.",
    };
  }
  if (!(await isAdminOfTeam(supabase, row.team_id as string, user.id))) {
    return { ok: false, error: "Only team admins can remove members" };
  }

  // Use service-role for the delete: a strict RLS policy could otherwise
  // refuse the delete even when isAdminOfTeam returns true (e.g. the
  // policy was tightened later). The admin check above is the gate.
  const admin = createAdminClient();
  const { error } = await admin
    .from("team_members")
    .delete()
    .eq("id", parsed.data.memberId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/team");
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
