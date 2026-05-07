"use client";

import { useEffect } from "react";

/**
 * Reload guard for cross-origin navigation returns.
 *
 * Problem: when the user clicks Upgrade → goes to Stripe Checkout →
 * hits browser back without paying, the dashboard page can come back
 * in a "frozen" state where:
 *   - React `pending` is still true from the in-flight startTransition
 *     that fired before window.location.href = stripeUrl took effect
 *   - All buttons that read `disabled={pending}` stay disabled
 *   - Server data doesn't re-fetch
 *   - Only a manual F5 fixes it
 *
 * Browsers handle this via the back-forward cache (bfcache). The
 * canonical detection is `pageshow` with `event.persisted === true`,
 * but Chrome and Safari don't fire `persisted: true` reliably when
 * `Cache-Control: no-store` is set (which we do on protected routes
 * via middleware). Net result: pageshow fires with persisted=false even
 * though the page is showing pre-nav React state.
 *
 * Strategy: a single `pageshow` listener that reloads when EITHER
 *
 *   1. `event.persisted === true` (classic bfcache)
 *   2. `document.referrer` matches a Stripe URL (Chrome's "stale
 *      paint but no persisted flag" case after a Stripe round-trip)
 *
 * `pageshow` fires on the initial paint AND on every bfcache restore,
 * so this handler covers both. Putting the referrer check inside the
 * listener (rather than at mount only) is the key: on bfcache restore
 * the original useEffect doesn't re-run, but the pageshow listener
 * registered by it still fires.
 *
 * Loop protection: a sessionStorage key is set just before reload and
 * cleared on the next mount. If we've just reloaded, we don't reload
 * again — even if the referrer still points at Stripe.
 */

const STRIPE_REFERRER_PATTERNS = [
  "checkout.stripe.com",
  "billing.stripe.com",
  "stripe.com/checkout",
  "stripe.com/customer-portal",
];

const ONESHOT_KEY = "ctp_bfcache_reloaded";

function reloadOnce(reason: string): void {
  try {
    if (sessionStorage.getItem(ONESHOT_KEY)) {
      sessionStorage.removeItem(ONESHOT_KEY);
      return;
    }
    sessionStorage.setItem(ONESHOT_KEY, reason);
  } catch {
    /* sessionStorage blocked: fall through and reload anyway —
       worst case is one extra reload, not an infinite loop because
       the second reload's referrer is the just-unloaded same-origin
       page, not Stripe. */
  }
  window.location.reload();
}

function fromStripe(): boolean {
  try {
    const ref = document.referrer || "";
    return Boolean(ref) && STRIPE_REFERRER_PATTERNS.some((p) => ref.includes(p));
  } catch {
    return false;
  }
}

export function BfcacheReload() {
  useEffect(() => {
    let justReloaded = false;
    try {
      if (sessionStorage.getItem(ONESHOT_KEY)) {
        sessionStorage.removeItem(ONESHOT_KEY);
        justReloaded = true;
      }
    } catch {
      /* noop */
    }

    // Mount-time fallback: pageshow fires before useEffect runs on the
    // very first paint, so the listener below would miss it. Catch the
    // initial fresh-load-from-Stripe case here.
    if (!justReloaded && fromStripe()) {
      reloadOnce("stripe-referrer-mount");
      return;
    }

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        reloadOnce("bfcache");
        return;
      }
      if (fromStripe()) {
        reloadOnce("stripe-referrer-pageshow");
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
