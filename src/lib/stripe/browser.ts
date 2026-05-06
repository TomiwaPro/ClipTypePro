"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

/**
 * Cached `loadStripe()` promise so we don't pull the Stripe.js script
 * more than once per session.
 */
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripeJs(): Promise<Stripe | null> {
  if (stripePromise) return stripePromise;
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    return Promise.resolve(null);
  }
  stripePromise = loadStripe(key);
  return stripePromise;
}
