"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api-client";
import { useUIStore } from "./ui-store";

/**
 * Pro upgrade modal — opens when:
 *   - free user clicks a Pro-locked sidebar item
 *   - free user clicks the "Upgrade to Pro" button in the sidebar footer
 *
 * Monthly / annual toggle previews the right price; the CTA hits
 * /api/stripe/create-checkout-session with the chosen cycle (the server
 * resolves the cycle to the canonical Stripe price ID — clients never
 * see the IDs directly).
 */

const REASON_HEADLINES: Record<string, string> = {
  team: "Teams unlocks shared snippets and admin controls",
  compliance: "Compliance Mode is Pro+",
  api: "API access is Pro+",
};

const FEATURES = [
  "Stealth, Fast & Instant speed modes",
  "Unlimited snippets",
  "Window Lock",
  "Team management & audit logs",
  "Compliance Mode (HIPAA/GDPR)",
  "API access (10k calls/mo)",
  "Multi-device sync (3 devices)",
];

export function UpgradeModal() {
  const open = useUIStore((s) => s.upgradeOpen);
  const reason = useUIStore((s) => s.upgradeReason);
  const close = useUIStore((s) => s.closeUpgrade);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [busy, setBusy] = useState(false);
  // Synchronous gate so two fast clicks don't fire two checkout sessions
  // before React commits the disabled state.
  const navInFlightRef = useRef(false);

  const headline =
    (reason && REASON_HEADLINES[reason]) ||
    "Unlock the full ClipType Pro platform";

  const monthlyPrice = "$9";
  const annualMonthly = "$6.58";

  const onUpgrade = async () => {
    if (navInFlightRef.current) return;
    navInFlightRef.current = true;
    setBusy(true);
    const result = await apiPost<{ url: string }>(
      "/api/stripe/create-checkout-session",
      { cycle },
    );
    if (!result.ok || !result.data.url) {
      navInFlightRef.current = false;
      setBusy(false);
      toast.error("Couldn't start checkout", {
        description: result.ok ? "No checkout URL returned" : result.error,
      });
      return;
    }
    window.location.href = result.data.url;
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : close())}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 4000,
            background: "rgba(0, 0, 0, .85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            animation: "fadeUp .2s ease",
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 4001,
            width: "calc(100% - 40px)",
            maxWidth: 440,
            background: "var(--c-surface)",
            border: "1px solid color-mix(in srgb, var(--c-primary) 44%, transparent)",
            borderRadius: 12,
            padding: 24,
            color: "var(--c-text)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="Close upgrade modal"
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "transparent",
                border: "none",
                color: "var(--c-text-muted)",
                cursor: "pointer",
                padding: 4,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={16} />
            </button>
          </Dialog.Close>

          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 24, color: "var(--c-primary)", marginBottom: 4 }}>✦</div>
            <Dialog.Title
              asChild
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  fontWeight: 700,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "var(--c-primary)" }}>Clip</span>
                <span style={{ color: "var(--c-text)" }}>Type</span>
                <span style={{ color: "var(--c-accent)" }}>Pro</span>
              </div>
            </Dialog.Title>
            <Dialog.Description
              style={{ fontSize: 12, color: "var(--c-text-dim)" }}
            >
              {headline}
            </Dialog.Description>
          </div>

          <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
            {FEATURES.map((f) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  gap: 7,
                  fontSize: 12,
                  color: "var(--c-text-dim)",
                }}
              >
                <span style={{ color: "var(--c-primary)", flexShrink: 0 }}>✦</span>
                {f}
              </div>
            ))}
          </div>

          {/* Monthly / annual toggle */}
          <div
            role="tablist"
            aria-label="Billing cycle"
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 4,
              borderRadius: 8,
              border: "1px solid var(--c-border)",
              background: "var(--c-surface-b)",
              marginBottom: 12,
            }}
          >
            {(["monthly", "annual"] as const).map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={cycle === c}
                type="button"
                onClick={() => setCycle(c)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  background: cycle === c ? "var(--c-surface)" : "transparent",
                  color: cycle === c ? "var(--c-text)" : "var(--c-text-dim)",
                  border:
                    cycle === c ? "1px solid var(--c-border)" : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                {c === "annual" ? "Annual (−27%)" : "Monthly"}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 14,
            }}
          >
            <PriceCard
              active={cycle === "monthly"}
              price={monthlyPrice}
              period="/ month"
            />
            <PriceCard
              active={cycle === "annual"}
              price={annualMonthly}
              period="/ mo · $79 billed yearly"
              accent
              footnote="Save 27%"
            />
          </div>

          <button
            type="button"
            onClick={onUpgrade}
            disabled={busy}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              background: "var(--c-primary)",
              color: "#000",
              fontWeight: 700,
              fontSize: 13,
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy
              ? "Opening checkout…"
              : `✦ Start 14-day Free Trial · ${cycle === "annual" ? "annual" : "monthly"}`}
          </button>
          <div
            style={{
              fontSize: 10,
              color: "var(--c-text-muted)",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            Cancel anytime · 14-day money-back
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PriceCard({
  active,
  price,
  period,
  accent,
  footnote,
}: {
  active: boolean;
  price: string;
  period: string;
  accent?: boolean;
  footnote?: string;
}) {
  return (
    <div
      style={{
        background: active && accent
          ? "color-mix(in srgb, var(--c-primary) 12%, transparent)"
          : "var(--c-surface-b)",
        border: `1px solid ${
          active
            ? accent
              ? "color-mix(in srgb, var(--c-primary) 44%, transparent)"
              : "var(--c-primary)"
            : "var(--c-border)"
        }`,
        borderRadius: 8,
        padding: 14,
        textAlign: "center",
        opacity: active ? 1 : 0.55,
        transition: "opacity .15s, border-color .15s",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 22,
          fontWeight: 700,
          color: accent ? "var(--c-primary)" : "var(--c-text)",
        }}
      >
        {price}
      </div>
      <div style={{ fontSize: 10, color: "var(--c-text-muted)" }}>{period}</div>
      {footnote && (
        <div
          style={{
            fontSize: 10,
            color: "var(--c-success)",
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {footnote}
        </div>
      )}
    </div>
  );
}
