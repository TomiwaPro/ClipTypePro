import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getStripe,
  getStripeEnv,
  isStripeConfigured,
} from "@/lib/stripe/server";
import { BillingClient } from "@/components/dashboard/billing/billing-client";

export const dynamic = "force-dynamic";

type SP = Promise<{
  success?: string;
  cancelled?: string;
  session_id?: string;
  refresh?: string;
}>;

/**
 * Billing page — current plan, plan switcher, coupon, invoice list,
 * payment method, manage-via-Stripe-portal links.
 *
 * Server-fetches profile (Supabase) + subscription/invoices/payment
 * method (Stripe). All Stripe calls are wrapped so a missing env or
 * transient API blip degrades gracefully — the page still renders the
 * Supabase-derived plan info with a "couldn't reach Stripe" notice.
 */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "tier, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at",
    )
    .eq("id", user.id)
    .single();

  // Aggregate stats for the churn modal narrative.
  // Sum char_count + duration across all sessions in two parallel queries.
  const [{ count: charsCount }, { data: durationRows }] = await Promise.all([
    supabase
      .from("typing_sessions")
      .select("char_count", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("typing_sessions")
      .select("duration_seconds")
      .eq("user_id", user.id),
  ]);
  const totalSec = (durationRows ?? []).reduce(
    (acc: number, r) => acc + ((r.duration_seconds as number | null) ?? 0),
    0,
  );
  const totalChars = charsCount ?? 0;

  const tier = (profile?.tier ?? "free") as
    | "free"
    | "pro"
    | "teams"
    | "enterprise";
  const stripeReady = isStripeConfigured();

  let stripeData: {
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string | null;
    interval?: "month" | "year" | null;
    paymentMethod?: { brand: string; last4: string; expMonth: number; expYear: number } | null;
    invoices?: Array<{
      id: string;
      number: string | null;
      created: string;
      total: number;
      currency: string;
      status: string | null;
      hostedUrl: string | null;
      pdfUrl: string | null;
    }>;
    error?: string | null;
  } = {};

  let monthlyPriceId = "";
  let annualPriceId = "";
  if (stripeReady) {
    try {
      const env = getStripeEnv();
      monthlyPriceId = env.monthlyPriceId;
      annualPriceId = env.annualPriceId;
    } catch (e) {
      stripeData.error = (e as Error).message;
    }
  }

  if (stripeReady && profile?.stripe_customer_id) {
    try {
      const stripe = getStripe();
      const [subs, invoices, customer] = await Promise.all([
        profile.stripe_subscription_id
          ? stripe.subscriptions.retrieve(
              profile.stripe_subscription_id as string,
            )
          : Promise.resolve(null),
        stripe.invoices.list({
          customer: profile.stripe_customer_id as string,
          limit: 12,
        }),
        stripe.customers.retrieve(profile.stripe_customer_id as string, {
          expand: ["invoice_settings.default_payment_method"],
        }),
      ]);

      const cancelEnd = subs?.cancel_at_period_end ?? false;
      const periodEnd =
        // Different Stripe API versions surface this on the subscription
        // top-level vs the items[] entry. Cast safely and read whichever
        // shape exists.
        ((subs as unknown as { current_period_end?: number })?.current_period_end ??
          subs?.items?.data?.[0]?.current_period_end ??
          null);
      const interval = subs?.items?.data?.[0]?.price?.recurring?.interval ?? null;

      // Payment method
      let pm: typeof stripeData.paymentMethod = null;
      if (
        customer &&
        !customer.deleted &&
        customer.invoice_settings?.default_payment_method &&
        typeof customer.invoice_settings.default_payment_method === "object" &&
        customer.invoice_settings.default_payment_method.card
      ) {
        const card = customer.invoice_settings.default_payment_method.card;
        pm = {
          brand: card.brand,
          last4: card.last4,
          expMonth: card.exp_month,
          expYear: card.exp_year,
        };
      }

      stripeData = {
        cancelAtPeriodEnd: cancelEnd,
        currentPeriodEnd: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        interval: (interval as "month" | "year" | null) ?? null,
        paymentMethod: pm,
        invoices: invoices.data.map((inv) => ({
          id: inv.id ?? "",
          number: inv.number,
          created: new Date(inv.created * 1000).toISOString(),
          total: inv.total,
          currency: inv.currency,
          status: (inv.status as string | null) ?? null,
          hostedUrl: inv.hosted_invoice_url ?? null,
          pdfUrl: inv.invoice_pdf ?? null,
        })),
      };
    } catch (e) {
      stripeData.error = (e as Error).message;
    }
  }

  return (
    <BillingClient
      tier={tier}
      subscriptionStatus={profile?.subscription_status ?? null}
      stripeReady={stripeReady}
      monthlyPriceId={monthlyPriceId}
      annualPriceId={annualPriceId}
      stripeData={stripeData}
      successFlag={sp.success === "true"}
      cancelledFlag={sp.cancelled === "true"}
      checkoutSessionId={sp.session_id ?? null}
      // refresh=portal arrives when the user comes back from Stripe's
      // Customer Portal. Treated like ?success — auto-sync + URL-strip.
      portalReturnFlag={sp.refresh === "portal"}
      stats={{
        charsTyped: charsCount ?? 0,
        // Naive estimate: every 5 chars = 1 word, 25 WPM manual baseline.
        hoursSaved:
          charsCount && charsCount > 0
            ? Math.max(1, Math.round((charsCount / 5 / 25) / 60))
            : 0,
        totalSeconds: totalSec,
        totalChars,
      }}
    />
  );
}
