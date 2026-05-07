import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getStripeEnv } from "@/lib/stripe/server";

/**
 * Creates a Stripe Checkout Session for a Pro subscription.
 *
 * Auth:
 *   - We re-derive userId + email from the Supabase session, never trust
 *     the client. Spec says we accept those fields, but we use them only
 *     for diagnostics — actual identity is the cookie-bound JWT.
 *
 * Coupon:
 *   - If `coupon` is provided, look it up as a Stripe Promotion Code
 *     (the customer-facing string like "STAY50"). If valid, attach the
 *     underlying Coupon ID as a discount on the checkout session.
 *   - Invalid codes 400 with a clear message — the client can display
 *     it inline next to the input.
 *
 * Trial:
 *   - 14-day free trial baked in (subscription_data.trial_period_days),
 *     matching the v4 marketing copy. Card is collected up front but
 *     not charged until trial ends.
 */

const bodySchema = z
  .object({
    priceId: z.string().optional(),
    cycle: z.enum(["monthly", "annual"]).optional(),
    coupon: z.string().optional(),
  })
  .refine((v) => Boolean(v.priceId || v.cycle), {
    message: "priceId or cycle is required",
  });

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    console.error("[stripe/create-checkout-session] unhandled:", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Checkout route crashed" },
      { status: 500 },
    );
  }
}

async function handle(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { priceId: rawPriceId, cycle, coupon } = parsed.data;

  // Auth + identity
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Allow only known price IDs. Resolve cycle → priceId server-side so
  // the client never has to know the actual Stripe price IDs.
  let stripeEnv;
  try {
    stripeEnv = getStripeEnv();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
  const priceId =
    rawPriceId ??
    (cycle === "annual" ? stripeEnv.annualPriceId : stripeEnv.monthlyPriceId);
  const allowedPriceIds = [stripeEnv.monthlyPriceId, stripeEnv.annualPriceId];
  if (!allowedPriceIds.includes(priceId)) {
    return NextResponse.json(
      { error: "Unknown priceId" },
      { status: 400 },
    );
  }

  // Resolve Stripe lazily — missing env surfaces here as JSON 500
  // rather than as an uncaught throw → HTML error page.
  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }

  // Reuse an existing Stripe customer if we already created one for this
  // user (post-cancellation / re-upgrade path), otherwise let Checkout
  // create one. Either way the webhook will write `stripe_customer_id`
  // back to `profiles` once the session completes.
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  // Resolve coupon code → Stripe coupon ID
  let discountCouponId: string | undefined = undefined;
  if (coupon && coupon.trim()) {
    try {
      const promo = await stripe.promotionCodes.list({
        code: coupon.trim(),
        active: true,
        limit: 1,
      });
      if (promo.data.length === 0) {
        return NextResponse.json(
          { error: "Invalid or expired coupon code" },
          { status: 400 },
        );
      }
      // Stripe v22: PromotionCode.promotion.coupon (string | Coupon | null).
      const cf = promo.data[0].promotion.coupon;
      discountCouponId = typeof cf === "string" ? cf : cf?.id;
      if (!discountCouponId) {
        return NextResponse.json(
          { error: "Coupon attached to this promotion code is invalid" },
          { status: 400 },
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message || "Coupon validation failed" },
        { status: 500 },
      );
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      // Reuse customer if we have one, otherwise pre-fill the email
      customer: profile?.stripe_customer_id ?? undefined,
      customer_email:
        profile?.stripe_customer_id ? undefined : user.email ?? undefined,
      // client_reference_id is the canonical "who is this" hint for the
      // webhook handler — it survives even if the customer object isn't
      // created yet.
      client_reference_id: user.id,
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id },
      },
      discounts: discountCouponId ? [{ coupon: discountCouponId }] : undefined,
      // If no coupon, also let the user enter one on Stripe's hosted page
      // as a fallback — only set when no programmatic discount is applied
      // (Stripe rejects both at once).
      allow_promotion_codes: discountCouponId ? undefined : true,
      success_url: `${stripeEnv.appUrl}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${stripeEnv.appUrl}/dashboard/billing?cancelled=true`,
      metadata: { user_id: user.id },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe didn't return a checkout URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
