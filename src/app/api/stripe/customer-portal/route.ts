import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getStripeEnv } from "@/lib/stripe/server";

/**
 * POST /api/stripe/customer-portal
 *
 * Creates a one-time Stripe Customer Portal session and returns its
 * URL. The portal lets users update payment method, view invoices,
 * cancel/resume subscription. Stripe hosts the entire UI.
 *
 * Only callable by an authenticated user with a stripe_customer_id
 * already on file (otherwise there's nothing to manage).
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
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer on file. Subscribe first." },
      { status: 400 },
    );
  }

  let env;
  try {
    env = getStripeEnv();
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id as string,
      return_url: `${env.appUrl}/dashboard/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Couldn't create portal session" },
      { status: 500 },
    );
  }
}
