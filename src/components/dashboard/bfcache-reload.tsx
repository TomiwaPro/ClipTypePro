"use client";

import { useEffect } from "react";

/**
 * Bfcache (back-forward cache) guard.
 *
 * Symptom this fixes: after the user clicks Upgrade → goes to Stripe →
 * hits browser back, Chrome restores the page exactly as it was frozen
 * — including stale React state, mid-flight `pending` flags, and stale
 * server-rendered data. Buttons appear disabled, the UI lies about
 * subscription state, and a manual refresh is the only way out.
 *
 * Why it happens: we set `Cache-Control: no-store` on protected routes
 * via middleware, which Chrome's spec says disables bfcache. In
 * practice Chrome still bfcaches in some same-tab navigation paths,
 * especially when the cross-origin nav is set via `window.location.href`
 * rather than a user-triggered link.
 *
 * Fix: when `pageshow` fires with `persisted === true`, the browser is
 * telling us "this page was just restored from bfcache." We force a
 * hard reload — server component re-runs, React state reinitialises,
 * URL params reapply, everything snaps to the truth.
 *
 * Initial page load also fires `pageshow` but with `persisted: false`,
 * so we don't loop.
 *
 * Mounted from the dashboard layout so every authenticated route gets
 * the same treatment, not just billing. Same bug class affects any
 * page that triggers a cross-origin nav (Stripe Checkout, OAuth, etc.).
 */
export function BfcacheReload() {
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // window.location.reload() is more reliable than router.refresh()
        // here — refresh() updates server data but leaves client state
        // intact, which is exactly what we don't want.
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
