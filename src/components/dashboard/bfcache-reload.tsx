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
 * via middleware). Net result: the page comes back alive but state
 * is stale and we never know.
 *
 * Two complementary detections, both protected by a one-shot flag so
 * we never loop:
 *
 *   1. Classic bfcache — `pageshow` with `persisted === true`.
 *      Fires reliably on Firefox; sometimes on Chrome.
 *
 *   2. Stripe referrer — on mount, if document.referrer points to any
 *      Stripe domain, force a reload. Catches Chrome's "non-bfcache
 *      stale render" case where pageshow doesn't fire with persisted
 *      but the page is still showing pre-nav React state.
 *
 * Loop protection: a sessionStorage key is set just before reload and
 * checked on the next mount. If we've just reloaded, we don't reload
 * again — even if the referrer still points at Stripe (it does, after
 * a reload, until the user navigates away). One-shot, then cleared.
 *
 * Mounted from the dashboard layout so every authenticated route gets
 * the same protection.
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
      // Already reloaded once for this back-nav — don't loop.
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

export function BfcacheReload() {
  useEffect(() => {
    // ─── First: clear a stale one-shot flag from a previous reload ──
    // If we just reloaded ourselves (the flag is set), pop it and stop.
    try {
      if (sessionStorage.getItem(ONESHOT_KEY)) {
        sessionStorage.removeItem(ONESHOT_KEY);
        return;
      }
    } catch {
      /* noop */
    }

    // ─── Stripe referrer fallback ────────────────────────────────────
    // Catch Chrome's "stale state but no bfcache signal" scenario.
    try {
      const ref = document.referrer || "";
      if (ref && STRIPE_REFERRER_PATTERNS.some((p) => ref.includes(p))) {
        reloadOnce("stripe-referrer");
        return;
      }
    } catch {
      /* noop */
    }

    // ─── Classic bfcache detection ───────────────────────────────────
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) reloadOnce("bfcache");
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
