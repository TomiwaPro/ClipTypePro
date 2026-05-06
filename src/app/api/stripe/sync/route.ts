import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

/**
 * POST /api/stripe/sync
 *
 * Self-healing sync: pulls the caller's current Stripe state and
 * mirrors it into `profiles`. Designed for two scenarios:
 *
 *   1. Post-checkout safety net — if the user just paid but the
 *      `checkout.session.completed` webhook didn't fire (Stripe CLI
 *      not running locally; misconfigured webhook secret in prod;
 *      transient failure), the billing page can call this on the
 *      ?success=true landing to update the DB on the spot.
 *
 *   2. Manual reconciliation — if the user thinks their tier is wrong,
 *      hitting this re-pulls truth from Stripe.
 *
 * Optionally accepts a checkout `sessionId` from the success URL —
 * if present, we resolve the customer/subscription from that session
 * (covers the "Customer didn't exist on the profile yet" case where the
 * webhook normally writes the IDs).
 *
 * Auth: cookie-bound user only. We use the SERVICE-ROLE Supabase client
 * for the actual DB write because the user themselves can't write to
 * `profiles.tier` (no RLS policy allows it; that's by design — only
 * webhooks/admin should change tier).
 */

const schema = z.object({
  sessionId: z.string().optional(),
});

type Tier = "free" | "pro" | "teams" | "enterprise";

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, tier")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | null;
  let subscriptionId = profile?.stripe_subscription_id as string | null;
  const stripe = getStripe();

  // If no customer on profile but we have a sessionId, recover from it.
  // Common case: webhook missed; user is on /billing?success=true&session_id=...
  if ((!customerId || !subscriptionId) && parsed.data.sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        parsed.data.sessionId,
      );
      // Defensive: only trust the session if its client_reference_id
      // matches the calling user. Stops a malicious caller from passing
      // someone else's session id.
      const sessionUserId =
        (session.client_reference_id ?? null) ||
        ((session.metadata?.user_id as string | undefined) ?? null);
      if (sessionUserId && sessionUserId !== user.id) {
        return NextResponse.json(
          { error: "Session belongs to a different user" },
          { status: 403 },
        );
      }
      customerId =
        (typeof session.customer === "string"
          ? session.customer
          : session.customer?.id) ?? customerId;
      subscriptionId =
        (typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id) ?? subscriptionId;
    } catch (e) {
      return NextResponse.json(
        { error: `Couldn't load checkout session: ${(e as Error).message}` },
        { status: 502 },
      );
    }
  }

  if (!customerId) {
    return NextResponse.json(
      { ok: true, tier: profile?.tier ?? "free", note: "No Stripe customer yet" },
    );
  }

  // Find the active or trialing subscription on this customer.
  // Type as plain Subscription (not Stripe.Response<…>) so the list
  // fallback below can assign `subs.data[0]` cleanly.
  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch {
      subscription = null;
    }
  }
  if (!subscription) {
    // Fallback: list customer's subscriptions and pick the first one
    // that's in a "user has access" state.
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 5,
    });
    subscription =
      subs.data.find((s) =>
        ["active", "trialing", "past_due"].includes(s.status),
      ) ?? subs.data[0] ?? null;
    subscriptionId = subscription?.id ?? null;
  }

  // Decide what tier to write based on subscription status.
  const status = subscription?.status ?? null;
  const tier: Tier =
    status === "active" || status === "trialing" || status === "past_due"
      ? "pro"
      : "free";

  const trialEnd = subscription?.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  // Use service-role client to bypass RLS — `profiles.tier` is only
  // writeable by the system, not the user themselves.
  const admin = createAdminClient();
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      tier,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      trial_ends_at: trialEnd,
    })
    .eq("id", user.id);

  if (updateErr) {
    return NextResponse.json(
      { error: `DB update failed: ${updateErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    tier,
    subscriptionStatus: status,
    customerId,
    subscriptionId,
  });
}
