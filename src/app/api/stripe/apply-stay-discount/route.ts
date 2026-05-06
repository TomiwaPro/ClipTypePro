import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

/**
 * POST /api/stripe/apply-stay-discount
 *
 * The "save offer" the ChurnModal makes when the user clicks Cancel.
 * Looks up the promotion code (default: STAY50), resolves to its
 * Coupon, and attaches that coupon to the user's existing subscription
 * for the next N billing cycles (per the coupon's duration setting).
 *
 * The user keeps Pro at the discounted rate. We don't cancel.
 */

const schema = z.object({
  code: z.string().min(1).default("STAY50"),
});

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    console.error("[stripe/apply-stay-discount] unhandled:", e);
    return NextResponse.json(
      { error: (e as Error)?.message || "Apply-stay-discount route crashed" },
      { status: 500 },
    );
  }
}

async function handle(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine — defaults to STAY50 */
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
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();
  const subId = profile?.stripe_subscription_id as string | null;
  if (!subId) {
    return NextResponse.json(
      { error: "No active subscription" },
      { status: 400 },
    );
  }

  const stripe = getStripe();

  // Resolve the promotion code → coupon ID.
  const promo = await stripe.promotionCodes.list({
    code: parsed.data.code.trim(),
    active: true,
    limit: 1,
  });
  if (promo.data.length === 0) {
    return NextResponse.json(
      { error: `Promotion code "${parsed.data.code}" is not active in Stripe.` },
      { status: 400 },
    );
  }
  // Stripe v22: PromotionCode.promotion.coupon (string | Coupon | null).
  const cf = promo.data[0].promotion.coupon;
  const couponId = typeof cf === "string" ? cf : cf?.id;
  if (!couponId) {
    return NextResponse.json(
      { error: "Coupon attached to this promotion code is invalid" },
      { status: 400 },
    );
  }

  try {
    await stripe.subscriptions.update(subId, {
      // `discounts` accepts an array; replacing rather than appending so
      // we don't stack discounts if the user clicks the offer multiple
      // times.
      discounts: [{ coupon: couponId }],
    });
    return NextResponse.json({ ok: true, applied: parsed.data.code.toUpperCase() });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Couldn't apply discount" },
      { status: 500 },
    );
  }
}
