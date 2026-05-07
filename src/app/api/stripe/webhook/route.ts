import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";

/**
 * Stripe webhook receiver.
 *
 * IMPORTANT:
 *   - The body must be the raw request bytes for signature verification.
 *     Use `req.text()` and pass it to `stripe.webhooks.constructEvent`.
 *   - We use the SERVICE-ROLE Supabase client because the request comes
 *     from Stripe, not an authenticated user — RLS would reject any
 *     write attempts. Service role bypasses RLS by design.
 *
 * Events handled:
 *   - checkout.session.completed     → upgrade user to Pro, store IDs
 *   - customer.subscription.updated  → mirror status to profiles
 *   - customer.subscription.deleted  → downgrade to free, clear IDs
 *   - invoice.payment_failed         → mark past_due (real email send
 *                                       slots into Step 9 / Resend)
 *
 * All handlers are idempotent — Stripe can replay events on transient
 * failures, so we tolerate seeing the same event twice without flapping
 * the user's state.
 */

// Use Node runtime — Stripe's signature verification needs Buffer/crypto.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Tier = "free" | "pro" | "teams" | "enterprise";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  // Raw bytes — DO NOT use req.json() here; Stripe needs the unmodified body.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (e) {
    // Bad signature or malformed payload — return 400 so Stripe retries
    // with a different signing secret if they've rotated.
    return NextResponse.json(
      { error: `Webhook signature failed: ${(e as Error).message}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, admin);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub, admin);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub, admin);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, admin);
        break;
      }
      default:
        // Acknowledge unhandled events so Stripe doesn't retry.
        break;
    }
  } catch (e) {
    // Returning 500 makes Stripe retry with backoff — useful for
    // transient DB blips. Log enough to debug from server logs.
    console.error("[stripe-webhook] handler error:", event.type, e);
    return NextResponse.json(
      { error: "Handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ──────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  admin: ReturnType<typeof createAdminClient>,
) {
  const userId = session.client_reference_id || (session.metadata?.user_id as string | undefined);
  if (!userId) {
    // Nothing to do — Checkout session not initiated through our flow.
    return;
  }
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  // Pull the live subscription so the status is the latest, not the
  // moment-of-creation status (could be 'trialing' or 'active' depending
  // on whether the trial period applies).
  let subscriptionStatus: string | null = null;
  let trialEnd: string | null = null;
  if (subscriptionId) {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    subscriptionStatus = sub.status;
    trialEnd = sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null;
  }

  await admin
    .from("profiles")
    .update({
      tier: "pro" as Tier,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
      subscription_status: subscriptionStatus,
      // If a trial is active, surface it. Existing trial_ends_at from
      // signup is overwritten — reasonable since they're now on a real
      // subscription trial backed by a card.
      trial_ends_at: trialEnd,
    })
    .eq("id", userId);

  // Referral conversion. If this user was referred (a referrals row
  // exists with referred_user_id = userId and status in pending/signed_up),
  // flip it to converted and credit the referrer one earned_month.
  //
  // Idempotency: the .in("status", ...) filter on the UPDATE ensures a
  // replay of this webhook (or a re-upgrade after cancellation) only
  // affects 0 rows and silently no-ops, so the referrer doesn't get
  // double-credited.
  try {
    const { data: pending } = await admin
      .from("referrals")
      .select("id, earned_months")
      .eq("referred_user_id", userId)
      .in("status", ["pending", "signed_up"])
      .limit(1)
      .maybeSingle();
    if (pending) {
      const next =
        ((pending.earned_months as number | null) ?? 0) + 1;
      await admin
        .from("referrals")
        .update({ status: "converted", earned_months: next })
        .eq("id", pending.id)
        .in("status", ["pending", "signed_up"]);
    }
  } catch (e) {
    console.warn(
      "[stripe-webhook] referral conversion failed (non-fatal):",
      (e as Error).message,
    );
  }

  // Defensive cleanup: cancel any other live subs on this customer.
  // Users who clicked Upgrade multiple times (or whose webhook history
  // is messy) can end up with multiple parallel subscriptions billing
  // them in parallel. We treat the just-completed Checkout sub as the
  // canonical one and cancel everything else immediately.
  if (customerId && subscriptionId) {
    try {
      const stripe = getStripe();
      const others = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
      });
      const cancellable = others.data.filter(
        (s) =>
          s.id !== subscriptionId &&
          (s.status === "active" ||
            s.status === "trialing" ||
            s.status === "past_due" ||
            s.status === "incomplete"),
      );
      for (const stale of cancellable) {
        try {
          await stripe.subscriptions.cancel(stale.id);
        } catch (e) {
          console.warn(
            "[stripe-webhook] failed to cancel stale sub",
            stale.id,
            (e as Error).message,
          );
        }
      }
    } catch (e) {
      console.warn(
        "[stripe-webhook] stale-sub cleanup failed:",
        (e as Error).message,
      );
    }
  }
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
  admin: ReturnType<typeof createAdminClient>,
) {
  const userId =
    (sub.metadata?.user_id as string | undefined) ??
    (await userIdFromCustomer(sub.customer, admin));
  if (!userId) return;

  // Only mirror events for the subscription we're currently tracking.
  // A user can have stale subs left over from earlier upgrades; events
  // for those would otherwise overwrite our pointer and corrupt state.
  // If the profile has no tracked sub yet (first event after Checkout),
  // we accept this event and let it set the pointer.
  const tracked = await trackedSubId(userId, admin);
  if (tracked && tracked !== sub.id) {
    console.warn(
      "[stripe-webhook] ignoring subscription.updated for non-tracked sub",
      { userId, eventSub: sub.id, trackedSub: tracked, status: sub.status },
    );
    return;
  }

  // If status is canceled / unpaid / incomplete_expired, drop the user
  // back to the free tier. Otherwise keep them on Pro and just mirror
  // the latest status. (cancel_at_period_end stays "active" until the
  // period actually ends — handled by the .deleted event.)
  const status = sub.status;
  const downgrade =
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired";

  await admin
    .from("profiles")
    .update({
      tier: downgrade ? ("free" as Tier) : ("pro" as Tier),
      subscription_status: status,
      stripe_subscription_id: downgrade ? null : sub.id,
      trial_ends_at: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
    })
    .eq("id", userId);
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
  admin: ReturnType<typeof createAdminClient>,
) {
  const userId =
    (sub.metadata?.user_id as string | undefined) ??
    (await userIdFromCustomer(sub.customer, admin));
  if (!userId) return;

  // Only downgrade if the deleted sub is the one we're tracking. A
  // delete event for a stale sub (e.g. one we cancelled in cleanup)
  // must not knock the user out of Pro on their real subscription.
  const tracked = await trackedSubId(userId, admin);
  if (tracked && tracked !== sub.id) {
    console.warn(
      "[stripe-webhook] ignoring subscription.deleted for non-tracked sub",
      { userId, eventSub: sub.id, trackedSub: tracked },
    );
    return;
  }

  await admin
    .from("profiles")
    .update({
      tier: "free" as Tier,
      stripe_subscription_id: null,
      subscription_status: "canceled",
    })
    .eq("id", userId);
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  admin: ReturnType<typeof createAdminClient>,
) {
  // Newer Stripe API versions expose `subscription` as a property of
  // the invoice; older types may not include it in the type defs.
  // Cast safely and resolve the user from the subscription metadata.
  const invSubId =
    (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription;
  const subscriptionId =
    typeof invSubId === "string" ? invSubId : invSubId?.id ?? null;
  if (!subscriptionId) return;

  const sub = await getStripe().subscriptions.retrieve(subscriptionId);
  const userId =
    (sub.metadata?.user_id as string | undefined) ??
    (await userIdFromCustomer(sub.customer, admin));
  if (!userId) return;

  // Only flag past_due if the failed invoice is for the sub we track.
  // Stale subs failing to charge must not poison the live sub's UI.
  const tracked = await trackedSubId(userId, admin);
  if (tracked && tracked !== subscriptionId) {
    console.warn(
      "[stripe-webhook] ignoring invoice.payment_failed for non-tracked sub",
      { userId, eventSub: subscriptionId, trackedSub: tracked },
    );
    return;
  }

  // Record the payment failure on the profile so the billing UI can
  // surface a "your payment failed" banner. A real email notification
  // wires up in Step 9 with Resend; for now we drop a notifications row
  // so the in-app badge fires.
  await admin
    .from("profiles")
    .update({ subscription_status: "past_due" })
    .eq("id", userId);

  // Idempotency: Stripe retries failed-payment events on backoff for
  // up to ~3 days, and also re-fires the same event id on transient
  // 5xx responses. The profile update above is naturally idempotent;
  // the notifications insert is not. Skip if a payment-failed notif
  // already exists for this user in the last 7 days.
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data: recent } = await admin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "billing")
    .eq("title", "Payment failed")
    .gte("created_at", sevenDaysAgo)
    .limit(1);
  if (recent && recent.length > 0) return;

  await admin.from("notifications").insert({
    user_id: userId,
    type: "billing",
    title: "Payment failed",
    message:
      "We couldn't charge your card on file. Update your payment method in Billing.",
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function userIdFromCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string | null> {
  const cid = typeof customer === "string" ? customer : customer?.id;
  if (!cid) return null;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", cid)
    .single();
  return (data?.id as string) ?? null;
}

async function trackedSubId(
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", userId)
    .single();
  return (data?.stripe_subscription_id as string | null) ?? null;
}
