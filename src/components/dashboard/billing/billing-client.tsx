"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { ChurnModal } from "./churn-modal";

/**
 * Billing UI — talks to the Stripe API routes and renders Supabase-derived
 * profile data. The server component wrapping this fetches everything we
 * need; this is purely UI + side-effects.
 *
 * Three core actions:
 *   Upgrade    → POST /api/stripe/create-checkout-session → window.location = url
 *   Manage     → POST /api/stripe/customer-portal           → window.location = url
 *   Cancel     → opens ChurnModal (which then calls cancel or apply-stay-discount)
 */

type Invoice = {
  id: string;
  number: string | null;
  created: string;
  total: number;
  currency: string;
  status: string | null;
  hostedUrl: string | null;
  pdfUrl: string | null;
};

type StripeData = {
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  interval?: "month" | "year" | null;
  paymentMethod?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  } | null;
  invoices?: Invoice[];
  error?: string | null;
};

export function BillingClient({
  tier,
  subscriptionStatus,
  stripeReady,
  monthlyPriceId,
  annualPriceId,
  stripeData,
  successFlag,
  cancelledFlag,
  checkoutSessionId,
  portalReturnFlag,
  stats,
}: {
  tier: "free" | "pro" | "teams" | "enterprise";
  subscriptionStatus: string | null;
  stripeReady: boolean;
  monthlyPriceId: string;
  annualPriceId: string;
  stripeData: StripeData;
  successFlag: boolean;
  cancelledFlag: boolean;
  checkoutSessionId: string | null;
  portalReturnFlag: boolean;
  stats: {
    charsTyped: number;
    hoursSaved: number;
    totalSeconds: number;
    totalChars: number;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncBusy, setSyncBusy] = useState(false);
  // Synchronous gate against rapid double-clicks on Upgrade / Manage —
  // `pending` from useTransition flips on the next render, so two
  // synchronous clicks both sail past `disabled={pending}` and create
  // two checkout sessions. Ref check at the top of the handler closes
  // that window.
  const navInFlightRef = useRef(false);

  // Last successful sync's diagnostic payload — used by the diagnostic
  // panel to show the user what we found so they (and we) can debug
  // any state mismatch without chasing dismissed toasts.
  type SyncDebug = {
    discoverySource: "session" | "profile" | "email-lookup" | "none";
    foundCustomerId: string | null;
    foundSubscriptionId: string | null;
    writtenTier?: string;
    writtenStatus?: string | null;
    note?: string;
  };
  const [lastSync, setLastSync] = useState<SyncDebug | null>(null);
  const [cycle, setCycle] = useState<"month" | "year">(
    stripeData.interval === "year" ? "year" : "month",
  );

  // Coupon input + validated state
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    label: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [churnOpen, setChurnOpen] = useState(false);

  const isFree = tier === "free";
  const onPaid = !isFree;
  const cancelled = stripeData.cancelAtPeriodEnd === true;

  /**
   * Auto-sync on mount when:
   *   - ?success=true       — user just finished checkout
   *   - ?refresh=portal     — user returned from Stripe Customer Portal
   *
   * In both cases, the user may have made a Stripe-side change (paid,
   * updated card, cancelled, resumed) that we need to mirror to the
   * profile row before rendering the dashboard with fresh data.
   *
   * The sync route is idempotent and uses the service-role Supabase
   * client to bypass RLS on profiles.tier (only the system writes
   * tier; webhooks + this sync are the only writers).
   */
  const syncedRef = useRef(false);
  const shouldSync = successFlag || portalReturnFlag;
  useEffect(() => {
    if (!shouldSync || syncedRef.current) return;
    syncedRef.current = true;
    setSyncBusy(true);
    (async () => {
      type SyncResponse = {
        ok: boolean;
        tier: string;
        subscriptionStatus?: string | null;
        note?: string;
        debug?: SyncDebug;
      };
      const result = await apiPost<SyncResponse>(
        "/api/stripe/sync",
        checkoutSessionId ? { sessionId: checkoutSessionId } : {},
      );
      if (!result.ok) {
        toast.error("Sync failed", { description: result.error });
        setSyncBusy(false);
        return;
      }
      if (successFlag && result.data.tier === "pro") {
        toast.success("Welcome to Pro 🎉", {
          description: "Your account is now upgraded.",
        });
      } else if (successFlag) {
        // Stripe didn't show an active subscription. Most likely the
        // checkout session is still finalising (rare race) or something
        // is misconfigured. The diagnostic banner below will show details.
        toast.warning("Sync ran but Stripe doesn't show an active subscription yet", {
          description: result.data.note ?? "Check the diagnostic panel below.",
        });
      } else if (portalReturnFlag) {
        // Stay quiet on portal returns — user hasn't necessarily done
        // anything that warrants a toast (they might have just clicked
        // the back arrow). They'll see the updated card / status in the
        // refreshed UI.
      }
      // Show the diagnostic panel only when something is actually off.
      // A clean Welcome-to-Pro or silent portal return doesn't need it —
      // it reads like an alarm and confuses users on the happy path.
      if (result.data.debug) {
        const stripeFoundActiveSub = result.data.tier === "pro";
        const somethingOff =
          (successFlag && !stripeFoundActiveSub) ||
          (portalReturnFlag && result.data.debug.discoverySource === "none");
        if (somethingOff) setLastSync(result.data.debug);
      }
      // Hard reload to /dashboard/billing (no query params).
      //
      // Why not router.replace + router.refresh: the App Router caches
      // the RSC payload for /dashboard/billing client-side. After a
      // portal cancellation, replace() shows that cached pre-cancel
      // payload, and a chained refresh() doesn't reliably override it.
      // A hard nav bypasses the router cache entirely and forces a
      // fresh server fetch — which now reads the updated profile (just
      // written by /api/stripe/sync) and re-pulls the subscription
      // from Stripe with cancel_at_period_end correctly populated.
      //
      // Cost is one extra full page load on the post-checkout / post-
      // portal path, which is fine — these are infrequent transitions
      // and correctness matters more than the RSC-update speedup.
      window.location.replace("/dashboard/billing");
    })();
  }, [shouldSync, successFlag, portalReturnFlag, checkoutSessionId, router]);

  /**
   * Manual "Refresh from Stripe" button — fallback for users whose
   * webhook + auto-sync both somehow missed. Calls the same sync
   * endpoint with no sessionId; it pulls fresh data from Stripe.
   */
  const onRefreshFromStripe = () => {
    setSyncBusy(true);
    (async () => {
      type SyncResponse = {
        ok: boolean;
        tier: string;
        subscriptionStatus?: string | null;
        note?: string;
        debug?: SyncDebug;
      };
      const result = await apiPost<SyncResponse>("/api/stripe/sync");
      if (!result.ok) {
        toast.error("Couldn't sync from Stripe", { description: result.error });
      } else {
        const note = result.data.note;
        const tier = result.data.tier;
        toast.success(
          tier === "pro" ? "Synced — you're on Pro" : "Synced from Stripe",
          {
            description: note
              ? note
              : `Tier: ${tier}${
                  result.data.subscriptionStatus
                    ? ` · ${result.data.subscriptionStatus}`
                    : ""
                }`,
          },
        );
        if (result.data.debug) setLastSync(result.data.debug);
        router.refresh();
      }
      setSyncBusy(false);
    })();
  };

  const onUpgrade = () => {
    if (navInFlightRef.current) return;
    if (!stripeReady) {
      toast.error("Stripe isn't configured", {
        description: "Set the STRIPE_* env vars in .env.local.",
      });
      return;
    }
    navInFlightRef.current = true;
    const priceId = cycle === "year" ? annualPriceId : monthlyPriceId;
    startTransition(async () => {
      const result = await apiPost<{ url: string }>(
        "/api/stripe/create-checkout-session",
        { priceId, coupon: couponApplied?.code },
      );
      if (!result.ok || !result.data.url) {
        navInFlightRef.current = false;
        toast.error("Couldn't start checkout", {
          description: result.ok ? "No checkout URL returned" : result.error,
        });
        return;
      }
      window.location.href = result.data.url;
    });
  };

  const onManage = () => {
    if (navInFlightRef.current) return;
    navInFlightRef.current = true;
    startTransition(async () => {
      const result = await apiPost<{ url: string }>("/api/stripe/customer-portal");
      if (!result.ok || !result.data.url) {
        navInFlightRef.current = false;
        toast.error("Couldn't open billing portal", {
          description: result.ok ? "No URL returned" : result.error,
        });
        return;
      }
      window.location.href = result.data.url;
    });
  };

  const onValidateCoupon = async () => {
    setCouponError(null);
    if (!coupon.trim()) {
      setCouponError("Enter a code");
      return;
    }
    type ValidatedCoupon = {
      ok: true;
      code: string;
      percentOff: number | null;
      amountOff: number | null;
      currency: string | null;
      duration: "forever" | "once" | "repeating";
      durationInMonths: number | null;
    };
    const result = await apiPost<ValidatedCoupon>(
      "/api/stripe/validate-coupon",
      { code: coupon.trim() },
    );
    if (!result.ok) {
      setCouponError(result.error);
      setCouponApplied(null);
      return;
    }
    const json = result.data;
    // Build a friendly label from the discount details
    const pct = json.percentOff ? `${json.percentOff}% off` : null;
    const amt =
      json.amountOff && json.currency
        ? `${(json.amountOff / 100).toFixed(2)} ${json.currency.toUpperCase()} off`
        : null;
    const dur =
      json.duration === "repeating" && json.durationInMonths
        ? ` for ${json.durationInMonths} mo`
        : json.duration === "once"
          ? " for one cycle"
          : "";
    setCouponApplied({
      code: json.code,
      label: `${pct ?? amt ?? "Discount applied"}${dur}`,
    });
    toast.success("Coupon applied", {
      description: `${pct ?? amt ?? ""}${dur}`,
    });
  };

  return (
    <div className="fade-up" style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      <div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Billing &amp; Subscription
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          Manage your plan, payment method, and invoices
        </p>
      </div>

      {/*
        Diagnostic panel — surfaces what the last sync found so the user
        (and we) can see why the page state might disagree with what they
        just did on Stripe. Shows when there's an obvious mismatch or
        when the user explicitly asked for a refresh.
      */}
      {lastSync && (
        <DiagnosticPanel
          tier={tier}
          lastSync={lastSync}
          onDismiss={() => setLastSync(null)}
        />
      )}

      {/* URL flags from checkout return.
          The ?success=true banner only shows while the auto-sync is in
          flight (or briefly after if the page hasn't refreshed yet).
          After router.replace strips ?success the banner is gone. */}
      {successFlag && (
        <Banner kind="success">
          {syncBusy
            ? "Finalising your upgrade with Stripe…"
            : "✓ Welcome to Pro! Your account has been upgraded."}
        </Banner>
      )}
      {cancelledFlag && (
        <Banner kind="warning">
          Checkout cancelled. No charge was made.
        </Banner>
      )}
      {!stripeReady && (
        <Banner kind="warning">
          Stripe isn&apos;t configured yet. Add the STRIPE_* environment
          variables in <code style={{ fontFamily: "var(--font-mono)" }}>.env.local</code>{" "}
          and restart the server to enable upgrades.
        </Banner>
      )}
      {stripeData.error && (
        <Banner kind="warning">
          Couldn&apos;t reach Stripe: {stripeData.error}
        </Banner>
      )}
      {cancelled && (
        <Banner kind="warning">
          🚫 Subscription cancelled.
          {stripeData.currentPeriodEnd ? (
            <>
              {" "}You&apos;ll keep Pro until{" "}
              <strong>{formatDate(stripeData.currentPeriodEnd)}</strong>, then
              automatically drop to Free. Resume anytime before that via
              Manage payment method.
            </>
          ) : (
            <> Resume anytime via Manage payment method.</>
          )}
        </Banner>
      )}
      {subscriptionStatus === "past_due" && (
        <Banner kind="danger">
          Last payment failed. Update your payment method to avoid losing Pro
          access.
        </Banner>
      )}

      {/* Plan card */}
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            Plan:{" "}
            <span
              style={{
                color: isFree ? "var(--c-text-dim)" : "var(--c-primary)",
              }}
            >
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </span>
            {subscriptionStatus && (
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  color: "var(--c-text-muted)",
                  background: "var(--c-surface-b)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 3,
                  padding: "2px 6px",
                }}
              >
                {subscriptionStatus.toUpperCase()}
              </span>
            )}
            {cancelled && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  color: "var(--c-warning)",
                  background:
                    "color-mix(in srgb, var(--c-warning) 15%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--c-warning) 35%, transparent)",
                  borderRadius: 3,
                  padding: "2px 6px",
                }}
              >
                CANCELLED
              </span>
            )}
          </div>

          {/* Monthly / annual toggle (free users picking what to upgrade to,
              paid users see their current cycle reflected) */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: 4,
              borderRadius: 7,
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-b)",
            }}
          >
            {(["month", "year"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCycle(c)}
                disabled={onPaid /* paid users can't switch via this; manage in portal */}
                style={{
                  padding: "5px 12px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  background:
                    cycle === c ? "var(--c-surface)" : "transparent",
                  color:
                    cycle === c ? "var(--c-text)" : "var(--c-text-dim)",
                  border:
                    cycle === c ? "1px solid var(--c-border)" : "none",
                  cursor: onPaid ? "not-allowed" : "pointer",
                  opacity: onPaid ? 0.6 : 1,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {c === "year" ? "Annual (−27%)" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 28,
            fontWeight: 700,
            color: "var(--c-primary)",
            marginBottom: 4,
          }}
        >
          {cycle === "month" ? "$9" : "$6.58"}
          <span
            style={{
              fontSize: 13,
              color: "var(--c-text-muted)",
              fontFamily: "var(--font-sans)",
            }}
          >
            /mo
          </span>
        </div>
        {cycle === "year" && (
          <div
            style={{
              fontSize: 11,
              color: "var(--c-success)",
              marginBottom: 10,
            }}
          >
            $79 billed yearly — save 27%
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {isFree ? (
            <>
              <button
                type="button"
                onClick={onUpgrade}
                disabled={pending || !stripeReady}
                style={primaryBtn(pending || !stripeReady)}
              >
                {pending ? "Opening checkout…" : "Upgrade to Pro →"}
              </button>
              {/*
                Refresh-from-Stripe escape hatch — visible to free users
                so anyone whose webhook didn't fire after a real upgrade
                can self-recover without contacting support.
              */}
              {stripeReady && (
                <button
                  type="button"
                  onClick={onRefreshFromStripe}
                  disabled={syncBusy}
                  title="If you just upgraded but still see Free, click this"
                  style={ghostBtn(syncBusy)}
                >
                  {syncBusy ? "Syncing…" : "Refresh from Stripe"}
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onManage}
                disabled={pending}
                style={ghostBtn(pending)}
              >
                {pending ? "Opening…" : "Manage payment method"}
              </button>
              {/*
                Refresh button always available for paid users too so a
                portal-side change (cancel, resume, plan switch) that
                somehow doesn't hit our webhook can be resynced manually.
              */}
              <button
                type="button"
                onClick={onRefreshFromStripe}
                disabled={syncBusy}
                title="Pull latest subscription state from Stripe"
                style={ghostBtn(syncBusy)}
              >
                {syncBusy ? "Syncing…" : "Refresh from Stripe"}
              </button>
              {!cancelled && (
                <button
                  type="button"
                  onClick={() => setChurnOpen(true)}
                  disabled={pending}
                  style={dangerBtn(pending)}
                >
                  Cancel subscription
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Coupon (free users only — paid users use the Stripe portal for changes) */}
      {isFree && (
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            padding: 18,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
            Promo / Coupon Code
          </div>
          {couponApplied ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  background:
                    "color-mix(in srgb, var(--c-success) 18%, transparent)",
                  color: "var(--c-success)",
                  padding: "2px 7px",
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  border:
                    "1px solid color-mix(in srgb, var(--c-success) 30%, transparent)",
                }}
              >
                APPLIED
              </span>
              <span style={{ color: "var(--c-success)" }}>
                {couponApplied.code} — {couponApplied.label}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCouponApplied(null);
                  setCoupon("");
                }}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  color: "var(--c-text-muted)",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={coupon}
                onChange={(e) => {
                  setCoupon(e.target.value);
                  setCouponError(null);
                }}
                placeholder="ENTER CODE"
                onKeyDown={(e) => e.key === "Enter" && onValidateCoupon()}
                style={{
                  flex: 1,
                  background: "var(--c-surface-b)",
                  border: `1px solid ${couponError ? "var(--c-danger)" : "var(--c-border)"}`,
                  borderRadius: 7,
                  padding: "8px 10px",
                  color: "var(--c-text)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={onValidateCoupon}
                style={{
                  padding: "8px 14px",
                  borderRadius: 7,
                  background: "var(--c-primary)",
                  color: "#000",
                  border: "none",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Apply
              </button>
            </div>
          )}
          {couponError && (
            <div
              style={{ fontSize: 11, color: "var(--c-danger)", marginTop: 6 }}
            >
              {couponError}
            </div>
          )}
        </div>
      )}

      {/* Payment method */}
      {onPaid && (
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            padding: 18,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
            Payment method
          </div>
          {stripeData.paymentMethod ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 13,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--c-surface-b)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 6,
                  padding: "5px 10px",
                  textTransform: "uppercase",
                  fontSize: 11,
                  letterSpacing: 0.5,
                }}
              >
                {stripeData.paymentMethod.brand}
              </div>
              <span style={{ fontFamily: "var(--font-mono)" }}>
                •••• {stripeData.paymentMethod.last4}
              </span>
              <span style={{ color: "var(--c-text-muted)", fontSize: 11 }}>
                exp{" "}
                {String(stripeData.paymentMethod.expMonth).padStart(2, "0")}/
                {String(stripeData.paymentMethod.expYear).slice(-2)}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
              No card on file. Use Manage payment method to add one.
            </div>
          )}
        </div>
      )}

      {/* Invoices */}
      {onPaid && stripeData.invoices && stripeData.invoices.length > 0 && (
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "13px 16px",
              borderBottom: "1px solid var(--c-border)",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            Invoice history
          </div>
          {stripeData.invoices.map((inv) => (
            <div
              key={inv.id}
              className="hover-row"
              style={{
                padding: "11px 16px",
                borderBottom: "1px solid var(--c-border)",
                display: "flex",
                gap: 14,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--c-text-muted)",
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {inv.number ?? inv.id}
              </span>
              <span style={{ color: "var(--c-text-dim)" }}>
                {formatDate(inv.created)}
              </span>
              <span
                style={{
                  color: "var(--c-primary)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                }}
              >
                {(inv.total / 100).toFixed(2)} {inv.currency.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  padding: "2px 6px",
                  borderRadius: 3,
                  background:
                    inv.status === "paid"
                      ? "color-mix(in srgb, var(--c-success) 15%, transparent)"
                      : "var(--c-surface-b)",
                  color:
                    inv.status === "paid"
                      ? "var(--c-success)"
                      : "var(--c-text-muted)",
                  border: `1px solid ${
                    inv.status === "paid"
                      ? "color-mix(in srgb, var(--c-success) 30%, transparent)"
                      : "var(--c-border)"
                  }`,
                }}
              >
                {(inv.status ?? "—").toUpperCase()}
              </span>
              {inv.pdfUrl && (
                <a
                  href={inv.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--c-text-dim)",
                    textDecoration: "none",
                    fontSize: 11,
                  }}
                  title="Download PDF"
                >
                  ↓ PDF
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <ChurnModal
        open={churnOpen}
        onOpenChange={setChurnOpen}
        charsTyped={stats.charsTyped || stats.totalChars}
        hoursSaved={stats.hoursSaved}
      />
    </div>
  );
}

// ─── Small UI helpers ───────────────────────────────────────────────────────

/**
 * Diagnostic panel that shows what the last sync found.
 *
 * Visible after any explicit Refresh from Stripe and after the auto-sync
 * fires on ?success=true. Lets the user (and us) see — without chasing
 * a dismissed toast — what's stored on profile vs what Stripe believes.
 *
 * The most useful signal is `discoverySource`: tells us which strategy
 * actually located the customer record. If "none", the user genuinely
 * has no Stripe customer (e.g. checkout was never completed).
 */
function DiagnosticPanel({
  tier,
  lastSync,
  onDismiss,
}: {
  tier: "free" | "pro" | "teams" | "enterprise";
  lastSync: {
    discoverySource: "session" | "profile" | "email-lookup" | "none";
    foundCustomerId: string | null;
    foundSubscriptionId: string | null;
    writtenTier?: string;
    writtenStatus?: string | null;
    note?: string;
  };
  onDismiss: () => void;
}) {
  const stillFreeAfterSync =
    lastSync.writtenTier === "free" || tier === "free";
  const tone = stillFreeAfterSync && lastSync.discoverySource === "none"
    ? "warning"
    : stillFreeAfterSync
      ? "warning"
      : "success";
  const color =
    tone === "success" ? "var(--c-success)" : "var(--c-warning)";

  return (
    <div
      role="status"
      style={{
        background: `color-mix(in srgb, ${color} 8%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
        borderRadius: 8,
        padding: 14,
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color }}>
          {tone === "success"
            ? "✓ Synced from Stripe"
            : "Sync ran — but state may be off"}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--c-text-muted)",
            cursor: "pointer",
            fontSize: 14,
            padding: 4,
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          gap: "4px 12px",
          fontSize: 11,
          color: "var(--c-text-dim)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>tier (after)</span>
        <span style={{ color: "var(--c-text)" }}>{tier}</span>

        <span>discovery</span>
        <span style={{ color: "var(--c-text)" }}>
          {lastSync.discoverySource}
        </span>

        <span>customer</span>
        <span style={{ color: "var(--c-text)" }}>
          {lastSync.foundCustomerId ?? "—"}
        </span>

        <span>subscription</span>
        <span style={{ color: "var(--c-text)" }}>
          {lastSync.foundSubscriptionId ?? "—"}
        </span>

        {lastSync.writtenStatus !== undefined && (
          <>
            <span>status</span>
            <span style={{ color: "var(--c-text)" }}>
              {lastSync.writtenStatus ?? "—"}
            </span>
          </>
        )}
      </div>

      {lastSync.note && (
        <div
          style={{
            fontSize: 12,
            color: "var(--c-text-dim)",
            lineHeight: 1.55,
          }}
        >
          {lastSync.note}
        </div>
      )}

      {stillFreeAfterSync && lastSync.discoverySource === "none" && (
        <div
          style={{
            fontSize: 12,
            color: "var(--c-text-dim)",
            lineHeight: 1.55,
          }}
        >
          We searched by Checkout session, profile, and your email. Stripe
          doesn&apos;t have a customer for this account yet — most likely the
          last Checkout wasn&apos;t completed. Click <strong>Upgrade to Pro →</strong>{" "}
          to try again.
        </div>
      )}
    </div>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const color =
    kind === "success"
      ? "var(--c-success)"
      : kind === "danger"
        ? "var(--c-danger)"
        : "var(--c-warning)";
  return (
    <div
      role="status"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
        color,
        borderRadius: 7,
        padding: "10px 12px",
        fontSize: 12,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "9px 18px",
    borderRadius: 8,
    background: "var(--c-primary)",
    color: "#000",
    border: "none",
    fontWeight: 700,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "var(--font-sans)",
  };
}

function ghostBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "9px 18px",
    borderRadius: 8,
    background: "var(--c-surface-b)",
    color: "var(--c-text)",
    border: "1px solid var(--c-border)",
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "var(--font-sans)",
  };
}

function dangerBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "9px 18px",
    borderRadius: 8,
    background: "color-mix(in srgb, var(--c-danger) 18%, transparent)",
    color: "var(--c-danger)",
    border: "1px solid color-mix(in srgb, var(--c-danger) 40%, transparent)",
    fontWeight: 600,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "var(--font-sans)",
  };
}
