import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

/**
 * POST /api/stripe/validate-coupon
 *
 * Looks up a Stripe Promotion Code (the customer-facing string the user
 * types into the billing page input — e.g. "STAY50"). Returns a tiny
 * summary the UI uses to show what discount applies, or a 400 if the
 * code doesn't match any active promotion.
 *
 * Auth-gated so anonymous traffic can't enumerate promotion codes.
 */

const schema = z.object({
  code: z.string().min(1, "Code is required").max(60),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Expand the nested coupon so we get its full details (percent_off
    // etc.) inline. Stripe v22: PromotionCode.promotion.coupon.
    const promo = await getStripe().promotionCodes.list({
      code: parsed.data.code.trim(),
      active: true,
      limit: 1,
      expand: ["data.promotion.coupon"],
    });
    if (promo.data.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired coupon code" },
        { status: 400 },
      );
    }
    const cf = promo.data[0].promotion.coupon;
    if (!cf || typeof cf === "string") {
      return NextResponse.json(
        { error: "Coupon details could not be loaded" },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      code: parsed.data.code.trim().toUpperCase(),
      // Either percent_off or amount_off will be populated.
      percentOff: cf.percent_off ?? null,
      amountOff: cf.amount_off ?? null,
      currency: cf.currency ?? null,
      duration: cf.duration, // 'forever' | 'once' | 'repeating'
      durationInMonths: cf.duration_in_months ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Coupon lookup failed" },
      { status: 500 },
    );
  }
}
