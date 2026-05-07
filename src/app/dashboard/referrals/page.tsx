import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  type ReferralRow,
  ReferralsClient,
} from "@/components/dashboard/referrals/referrals-client";

export const dynamic = "force-dynamic";

/**
 * Referrals — the user's unique code, share link, history, and stats.
 *
 * Code generation: profiles.referral_code has a NOT NULL default that
 * generates a 12-char hex (migration 004). New users get a code at
 * insert time; existing users were backfilled. So we never need to
 * generate a code in app code.
 *
 * History: pulled from the referrals table, RLS-scoped to referrer_id.
 */
export default async function ReferralsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: refs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single(),
    supabase
      .from("referrals")
      .select("id, referred_email, status, earned_months, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const referralCode = (profile?.referral_code as string | null) ?? null;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
    "https://cliptypepro.com";
  const referralLink = referralCode ? `${appUrl}/ref/${referralCode}` : null;

  const rows: ReferralRow[] = (refs ?? []).map((r) => ({
    id: r.id as string,
    email: r.referred_email as string,
    status: r.status as ReferralRow["status"],
    earnedMonths: (r.earned_months as number | null) ?? 0,
    createdAt: r.created_at as string,
  }));

  const stats = {
    referred: rows.length,
    converted: rows.filter((r) => r.status === "converted").length,
    monthsEarned: rows.reduce((a, r) => a + r.earnedMonths, 0),
  };

  return (
    <ReferralsClient
      referralCode={referralCode}
      referralLink={referralLink}
      referrals={rows}
      stats={stats}
    />
  );
}
