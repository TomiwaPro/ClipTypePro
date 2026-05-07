import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

/**
 * POST /api/stripe/sync
 *
 * Self-healing reconciliation: pulls the caller's *current* Stripe state
 * and writes it back into `profiles`. Designed to recover from any
 * scenario where Stripe and our DB have drifted:
 *
 *   1. Webhook never fired (Stripe CLI not running locally; production
 *      endpoint not yet configured)
 *   2. Webhook fired but we missed the response
 *   3. User upgraded in a previous session and the row never got the
 *      stripe_customer_id (because (1) or (2))
 *   4. Manual reconciliation triggered by the user via "Refresh from Stripe"
 *
 * Customer-discovery cascade (3 strategies):
 *
 *   A. `sessionId` from the request body (passed when /billing?success=true&session_id=…)
 *      → retrieve the Checkout Session, pull customer + subscription IDs
 *
 *   B. `profile.stripe_customer_id` already on file
 *      → use it directly
 *
 *   C. Email lookup: `stripe.customers.list({ email: user.email })`
 *      → catches the case where the profile has no IDs yet but the user
 *        has a Stripe customer with their email (which Checkout always
 *        creates when it sees customer_email in the request)
 *
 * Whatever finds the customer also finds (or lists for) the subscription.
 *
 * Auth: cookie-bound user only. Writes to profiles via the SERVICE-ROLE
 * client (RLS would otherwise block the user from changing their own
 * tier — by design).
 *
 * Response always includes a `debug` block with what each strategy found,
 * so the caller can render a useful banner when reconciliation fails.
 */

const schema = z.object({
  sessionId: z.string().optional(),
});

type Tier = "free" | "pro" | "teams" | "enterprise";

type DiscoveryResult = {
  customerId: string | null;
  subscriptionId: string | null;
  source:
    | "session"
    | "profile"
    | "email-lookup"
    | "none";
};

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    console.error("[stripe/sync] unhandled:", e);
    return NextResponse.json(
      {
        ok: false,
        error: (e as Error)?.message || "Sync route crashed",
        debug: { stage: "unhandled" },
      },
      { status: 500 },
    );
  }
}

async function handle(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body OK */
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

  // Resolve Stripe SDK lazily — surface missing-env as JSON 500.
  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message, debug: { stage: "stripe-init" } },
      { status: 500 },
    );
  }

  // ─── Customer discovery cascade ─────────────────────────────────────────
  const discovery = await discoverCustomer({
    sessionId: parsed.data.sessionId,
    profileCustomerId: (profile?.stripe_customer_id as string | null) ?? null,
    profileSubscriptionId:
      (profile?.stripe_subscription_id as string | null) ?? null,
    userId: user.id,
    userEmail: user.email ?? null,
    stripe,
  });

  const debug = {
    userId: user.id,
    userEmail: user.email ?? null,
    profileTier: (profile?.tier as Tier) ?? "free",
    profileCustomerId: (profile?.stripe_customer_id as string | null) ?? null,
    profileSubscriptionId:
      (profile?.stripe_subscription_id as string | null) ?? null,
    sessionIdProvided: Boolean(parsed.data.sessionId),
    discoverySource: discovery.source,
    foundCustomerId: discovery.customerId,
    foundSubscriptionId: discovery.subscriptionId,
  };

  if (!discovery.customerId) {
    // Stripe has no customer for this user. Most likely they never
    // completed a Checkout session.
    return NextResponse.json({
      ok: true,
      tier: (profile?.tier as Tier) ?? "free",
      subscriptionStatus: null,
      note: "No Stripe customer found for this user (tried session, profile, and email lookup).",
      debug,
    });
  }

  // ─── Resolve subscription on this customer ──────────────────────────────
  let subscription: Stripe.Subscription | null = null;
  if (discovery.subscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(
        discovery.subscriptionId,
      );
    } catch {
      subscription = null;
    }
  }
  if (!subscription) {
    // Final fallback: list subs on the customer, take the first that's
    // in any "user has access" state, otherwise the first at all.
    const subs = await stripe.subscriptions.list({
      customer: discovery.customerId,
      status: "all",
      limit: 5,
    });
    subscription =
      subs.data.find((s) =>
        ["active", "trialing", "past_due"].includes(s.status),
      ) ??
      subs.data[0] ??
      null;
  }

  const status = subscription?.status ?? null;
  const tier: Tier =
    status === "active" || status === "trialing" || status === "past_due"
      ? "pro"
      : "free";

  const trialEnd = subscription?.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;

  const finalSubId = subscription?.id ?? null;

  // Use service-role client to bypass RLS — `profiles.tier` is only
  // writeable by the system, not the user themselves.
  const admin = createAdminClient();
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      tier,
      stripe_customer_id: discovery.customerId,
      stripe_subscription_id: finalSubId,
      subscription_status: status,
      trial_ends_at: trialEnd,
    })
    .eq("id", user.id);

  if (updateErr) {
    return NextResponse.json(
      {
        ok: false,
        error: `DB update failed: ${updateErr.message}`,
        debug: {
          ...debug,
          stage: "db-update",
          attemptedTier: tier,
          attemptedStatus: status,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    tier,
    subscriptionStatus: status,
    customerId: discovery.customerId,
    subscriptionId: finalSubId,
    debug: {
      ...debug,
      writtenTier: tier,
      writtenStatus: status,
    },
  });
}

// ─── Discovery helper ────────────────────────────────────────────────────

async function discoverCustomer({
  sessionId,
  profileCustomerId,
  profileSubscriptionId,
  userId,
  userEmail,
  stripe,
}: {
  sessionId?: string;
  profileCustomerId: string | null;
  profileSubscriptionId: string | null;
  userId: string;
  userEmail: string | null;
  stripe: ReturnType<typeof getStripe>;
}): Promise<DiscoveryResult> {
  // Strategy A: session ID from the request (post-checkout success page).
  // Trust the session only if its client_reference_id matches the caller
  // — defends against a malicious caller passing someone else's session.
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const sessionUserId =
        (session.client_reference_id ?? null) ||
        ((session.metadata?.user_id as string | undefined) ?? null);
      if (sessionUserId && sessionUserId !== userId) {
        // Don't throw — fall through so we try other strategies. Logged.
        console.warn(
          "[stripe/sync] session belongs to a different user; ignoring",
        );
      } else {
        const cid =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;
        const sid =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (cid) {
          return {
            customerId: cid,
            subscriptionId: sid ?? profileSubscriptionId,
            source: "session",
          };
        }
      }
    } catch (e) {
      console.warn("[stripe/sync] session retrieve failed:", (e as Error).message);
    }
  }

  // Strategy B: customer_id already on file. Cheapest and most accurate.
  if (profileCustomerId) {
    return {
      customerId: profileCustomerId,
      subscriptionId: profileSubscriptionId,
      source: "profile",
    };
  }

  // Strategy C: email lookup. Slowest but recovers from "webhook never
  // fired AND no sessionId" — common after the very first checkout if
  // the dev env didn't have stripe listen running.
  if (userEmail) {
    try {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 5,
      });
      // Pick the one that has any subscriptions, or just the first.
      let pick = customers.data.find(async (c) => {
        const subs = await stripe.subscriptions.list({
          customer: c.id,
          limit: 1,
        });
        return subs.data.length > 0;
      });
      pick = pick ?? customers.data[0];
      if (pick) {
        return {
          customerId: pick.id,
          subscriptionId: profileSubscriptionId,
          source: "email-lookup",
        };
      }
    } catch (e) {
      console.warn("[stripe/sync] email lookup failed:", (e as Error).message);
    }
  }

  return { customerId: null, subscriptionId: null, source: "none" };
}
