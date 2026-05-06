"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";

/**
 * Platform warning modal.
 *
 * Shown before typing on a red-rated platform (e.g. Twitter/X, LinkedIn,
 * Stripe). User must acknowledge the risk via checkbox before "Proceed"
 * unlocks. Cancel is always available.
 *
 * The caller already auto-activated Stealth mode before opening — this
 * modal exists to make the user aware, not to change typing behaviour.
 */
export function PlatformWarningModal({
  open,
  platform,
  onProceed,
  onCancel,
}: {
  open: boolean;
  platform: string | null;
  onProceed: () => void;
  onCancel: () => void;
}) {
  const [understood, setUnderstood] = useState(false);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setUnderstood(false);
          onCancel();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5500,
            background: "rgba(0,0,0,.85)",
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
            zIndex: 5501,
            width: "calc(100% - 40px)",
            maxWidth: 420,
            background: "var(--c-surface)",
            border:
              "1px solid color-mix(in srgb, var(--c-danger) 44%, transparent)",
            borderRadius: 12,
            padding: 22,
            color: "var(--c-text)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 28 }}>⚠️</div>
            <div>
              <Dialog.Title asChild>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    marginBottom: 4,
                    color: "var(--c-danger)",
                  }}
                >
                  High-risk platform detected
                </div>
              </Dialog.Title>
              <Dialog.Description style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
                {platform} has active bot detection that may flag automated typing.
              </Dialog.Description>
            </div>
          </div>

          <div
            style={{
              background: "var(--c-surface-b)",
              borderRadius: 8,
              padding: 14,
              marginBottom: 16,
              fontSize: 12,
              color: "var(--c-text-dim)",
              lineHeight: 1.7,
            }}
          >
            <div style={{ marginBottom: 5 }}>
              🔴 Your account may be flagged or suspended
            </div>
            <div style={{ marginBottom: 5 }}>
              🔒 Stealth Mode has been auto-activated
            </div>
            <div>📋 ClipType Pro is not responsible for third-party enforcement</div>
          </div>

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              marginBottom: 16,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              style={{
                marginTop: 2,
                accentColor: "var(--c-danger)",
                width: 14,
                height: 14,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: "var(--c-text-dim)", lineHeight: 1.5 }}>
              I understand the risk and accept full responsibility.
            </span>
          </label>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (understood) {
                  setUnderstood(false);
                  onProceed();
                }
              }}
              disabled={!understood}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "color-mix(in srgb, var(--c-danger) 18%, transparent)",
                color: "var(--c-danger)",
                border:
                  "1px solid color-mix(in srgb, var(--c-danger) 40%, transparent)",
                fontWeight: 600,
                fontSize: 12,
                cursor: understood ? "pointer" : "not-allowed",
                opacity: understood ? 1 : 0.5,
                fontFamily: "var(--font-sans)",
              }}
            >
              Proceed at my own risk
            </button>
            <button
              type="button"
              onClick={() => {
                setUnderstood(false);
                onCancel();
              }}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--c-surface-b)",
                color: "var(--c-text-dim)",
                border: "1px solid var(--c-border)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
