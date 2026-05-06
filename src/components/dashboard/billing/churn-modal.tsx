"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiPost } from "@/lib/api-client";

/**
 * Churn-prevention modal — opens when a Pro user clicks Cancel.
 *
 *   Step 1: offer 50% off for 3 months (STAY50)
 *     ├── "Keep Pro at 50% off" → POST /api/stripe/apply-stay-discount
 *     └── "Cancel anyway"        → POST /api/stripe/cancel-subscription
 *                                    (cancel_at_period_end = true)
 *
 * After either action, refresh the page so the billing card reflects
 * the new state. Tasteful: only shows the offer once per cancel attempt.
 */
export function ChurnModal({
  open,
  onOpenChange,
  charsTyped,
  hoursSaved,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  charsTyped: number;
  hoursSaved: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKind, setBusyKind] = useState<"keep" | "cancel" | null>(null);

  const onKeep = () => {
    setBusyKind("keep");
    startTransition(async () => {
      const result = await apiPost("/api/stripe/apply-stay-discount", {
        code: "STAY50",
      });
      if (!result.ok) {
        toast.error("Couldn't apply discount", { description: result.error });
      } else {
        toast.success("Discount applied — 50% off for 3 months");
        onOpenChange(false);
        router.refresh();
      }
      setBusyKind(null);
    });
  };

  const onCancel = () => {
    setBusyKind("cancel");
    startTransition(async () => {
      const result = await apiPost("/api/stripe/cancel-subscription");
      if (!result.ok) {
        toast.error("Couldn't cancel", { description: result.error });
      } else {
        toast.info("Subscription will end at the current period close");
        onOpenChange(false);
        router.refresh();
      }
      setBusyKind(null);
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 6000,
            background: "rgba(0, 0, 0, .85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 6001,
            width: "calc(100% - 40px)",
            maxWidth: 440,
            background: "var(--c-surface)",
            border:
              "1px solid color-mix(in srgb, var(--c-warning) 44%, transparent)",
            borderRadius: 12,
            padding: 22,
            color: "var(--c-text)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>😢</div>
            <Dialog.Title
              style={{
                fontWeight: 700,
                fontSize: 18,
                marginBottom: 6,
              }}
            >
              Before you go…
            </Dialog.Title>
            <Dialog.Description
              style={{
                fontSize: 13,
                color: "var(--c-text-dim)",
                lineHeight: 1.65,
              }}
            >
              You&apos;ve typed{" "}
              <strong style={{ color: "var(--c-primary)" }}>
                {charsTyped.toLocaleString()} characters
              </strong>{" "}
              and saved an estimated{" "}
              <strong style={{ color: "var(--c-success)" }}>
                {hoursSaved} hours
              </strong>{" "}
              with ClipType Pro.
            </Dialog.Description>
          </div>

          <div
            style={{
              background: "var(--c-surface-b)",
              borderRadius: 8,
              padding: 16,
              marginBottom: 18,
              border: "1px solid var(--c-border)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "var(--c-warning)",
                marginBottom: 10,
              }}
            >
              🎁 Stay & get 50% off for 3 months
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--c-text-dim)",
                lineHeight: 1.65,
              }}
            >
              We&apos;ll apply{" "}
              <strong
                style={{
                  fontFamily: "var(--font-mono)",
                  color: "var(--c-primary)",
                }}
              >
                STAY50
              </strong>{" "}
              to your subscription — $4.50/month for 3 months, then $9/month.
              Cancel anytime.
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <button
              type="button"
              onClick={onKeep}
              disabled={pending}
              style={{
                padding: 12,
                borderRadius: 8,
                background: "var(--c-primary)",
                color: "#000",
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.6 : 1,
                fontFamily: "var(--font-sans)",
              }}
            >
              {busyKind === "keep" ? "Applying…" : "✦ Keep Pro at 50% off"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              style={{
                padding: 12,
                borderRadius: 8,
                background: "var(--c-surface-b)",
                color: "var(--c-text-dim)",
                border: "1px solid var(--c-border)",
                fontWeight: 600,
                fontSize: 13,
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.6 : 1,
                fontFamily: "var(--font-sans)",
              }}
            >
              {busyKind === "cancel" ? "Cancelling…" : "No thanks, cancel anyway"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
