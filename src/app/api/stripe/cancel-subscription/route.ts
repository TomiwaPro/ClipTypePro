import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

/**
 * POST /api/stripe/cancel-subscription
 *
 * Sets `cancel_at_period_end: true` on the user's subscription. The
 * user keeps Pro access until the current period ends — Stripe fires
 * `customer.subscription.deleted` at that point and our webhook
 * downgrades the profile to free.
 *
 * We don't delete immediately — refunding mid-period is messy and the
 * user has paid for the rest of the period.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  const subId = profile?.stripe_subscription_id as string | null;
  if (!subId) {
    return NextResponse.json(
      { error: "No active subscription to cancel" },
      { status: 400 },
    );
  }

  try {
    const sub = await getStripe().subscriptions.update(subId, {
      cancel_at_period_end: true,
      metadata: { cancellation_source: "billing-page" },
    });
    return NextResponse.json({
      ok: true,
      cancelAt: sub.cancel_at
        ? new Date(sub.cancel_at * 1000).toISOString()
        : null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Couldn't cancel subscription" },
      { status: 500 },
    );
  }
}
