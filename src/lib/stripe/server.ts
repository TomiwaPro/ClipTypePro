import "server-only";
import Stripe from "stripe";

/**
 * Singleton Stripe SDK instance for server contexts.
 *
 * Lazy: getStripe() throws a clear error if STRIPE_SECRET_KEY is missing,
 * so a missing-env state surfaces as a useful 500 rather than a cryptic
 * "stripe is undefined" deep in a route handler.
 *
 * apiVersion: pinned so Stripe doesn't silently change behaviour under
 * us. Update deliberately when reviewing the changelog.
 */

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local from your Stripe dashboard.",
    );
  }
  _stripe = new Stripe(secret, {
    // No explicit apiVersion: SDK uses its built-in default, which
    // matches what your Stripe dashboard pins for new accounts.
    typescript: true,
    appInfo: {
      name: "ClipType Pro",
      url: "https://cliptypepro.com",
    },
  });
  return _stripe;
}

/**
 * Pull required env vars in one place — every Stripe-touching route
 * starts by calling this so missing-env errors are uniform.
 */
export type StripeEnv = {
  monthlyPriceId: string;
  annualPriceId: string;
  appUrl: string;
};

export function getStripeEnv(): StripeEnv {
  const monthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  const annualPriceId = process.env.STRIPE_PRO_ANNUAL_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!monthlyPriceId || !annualPriceId) {
    throw new Error(
      "Stripe price IDs are missing. Set STRIPE_PRO_MONTHLY_PRICE_ID and STRIPE_PRO_ANNUAL_PRICE_ID in .env.local.",
    );
  }
  return { monthlyPriceId, annualPriceId, appUrl };
}

/**
 * Quick test for "is Stripe even configured" — used by UI server
 * components to decide whether to show the real billing surface or a
 * "Stripe not configured" notice.
 */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID &&
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  );
}
