import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-only helper called when a new user finishes signup.
 *
 * Reads the ctp_ref cookie set by /ref/<code>, looks up the referrer
 * by their referral_code, and inserts a referrals row pointing the new
 * user back at them. Always clears the cookie on first attempt so a
 * subsequent sign-in (e.g. user logs in via OAuth from a different
 * browsing session) doesn't re-fire.
 *
 * Uses the service-role client because:
 *   - reading another user's referral_code is blocked by profiles RLS
 *   - inserting into referrals requires elevated perms; the row's
 *     referrer_id and referred_user_id reference different users
 *
 * Idempotent: the unique constraint on (referrer_id, referred_email)
 * makes a duplicate insert a no-op (PostgresError 23505 caught and
 * ignored). Self-referrals are rejected explicitly.
 *
 * Failure modes are all swallowed — referral capture is best-effort
 * and must never block signup completion.
 */
export async function recordReferralFromCookie(
  newUserId: string,
  newUserEmail: string,
): Promise<void> {
  const COOKIE_NAME = "ctp_ref";

  let code: string | undefined;
  try {
    const jar = await cookies();
    code = jar.get(COOKIE_NAME)?.value;
    if (!code) return;
    // Clear unconditionally so we don't repeatedly try (and fail) on
    // every subsequent signin / callback hit.
    jar.delete(COOKIE_NAME);
  } catch {
    return;
  }

  if (!newUserEmail) return;

  try {
    const admin = createAdminClient();

    const { data: referrer, error: lookupErr } = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (lookupErr || !referrer) return;
    if ((referrer.id as string) === newUserId) return; // self-referral

    // Ignore the insert error if the row already exists — Postgres returns
    // 23505 (unique_violation) on (referrer_id, referred_email), which
    // means we've already recorded this referral and there's nothing more
    // to do. Other errors are logged but not surfaced.
    const { error: insertErr } = await admin.from("referrals").insert({
      referrer_id: referrer.id,
      referred_email: newUserEmail,
      referred_user_id: newUserId,
      status: "signed_up",
      earned_months: 0,
    });
    if (insertErr && insertErr.code !== "23505") {
      console.warn(
        "[referrals] insert failed (non-fatal):",
        insertErr.message,
      );
    }
  } catch (e) {
    console.warn("[referrals] capture threw (non-fatal):", (e as Error).message);
  }
}
