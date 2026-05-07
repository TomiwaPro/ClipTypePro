import "server-only";

/**
 * Pro-access gate.
 *
 * A user has Pro access if EITHER:
 *   - their tier is paid (pro / teams / enterprise), OR
 *   - they're on a paid tier's trial that hasn't expired
 *
 * Why both: handle_new_user creates every signup with tier='free' but
 * trial_ends_at = now() + 14 days. The marketing copy promises a "14-day
 * Pro trial" with no card, so a brand-new user MUST be able to reach
 * the Pro-locked pages even though their DB tier is 'free'.
 *
 * The subscription_status guard prevents a stale trial_ends_at from
 * a long-since-cancelled Stripe sub from re-granting access. After
 * the post-trial cancel path, subscription_status is 'canceled' /
 * 'unpaid' / etc and trial_ends_at no longer counts.
 */
export function hasProAccess(profile: {
  tier?: string | null;
  trial_ends_at?: string | null;
  subscription_status?: string | null;
}): boolean {
  const tier = profile.tier ?? "free";
  if (tier !== "free") return true;
  // Free tier — only the signup trial counts, and only if there's no
  // history of a Stripe subscription on this account.
  if (profile.subscription_status) return false;
  if (!profile.trial_ends_at) return false;
  return new Date(profile.trial_ends_at).getTime() > Date.now();
}
