"use client";

import { useEffect, useState, useTransition } from "react";
import { ghostButtonStyle } from "@/components/auth/auth-card";
import { resendConfirmationAction } from "@/lib/auth/actions";

const DEFAULT_COOLDOWN = 60;

function formatRemaining(seconds: number): string {
  if (seconds <= 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (mins < 60) return `${mins}m ${rem.toString().padStart(2, "0")}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins.toString().padStart(2, "0")}m`;
}

export function ResendButton({ email }: { email: string }) {
  // 0 = enabled, >0 = disabled (showing remaining seconds)
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  // Countdown ticker.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  const onClick = () => {
    if (secondsLeft > 0 || pending || !email) return;
    setMessage(null);
    startTransition(async () => {
      const result = await resendConfirmationAction(email);
      if (result.ok) {
        const cd = result.data?.cooldownSeconds ?? DEFAULT_COOLDOWN;
        setMessage({ kind: "ok", text: "Sent! Check your inbox again." });
        setSecondsLeft(cd);
      } else {
        // Even on failure, start a cooldown so the user can't spam clicks.
        // For rate-limit errors, the action embeds the actual wait in fieldErrors._cooldown.
        const fromServer = Number(result.fieldErrors?._cooldown?.[0]);
        const cd = Number.isFinite(fromServer) && fromServer > 0
          ? fromServer
          : DEFAULT_COOLDOWN;
        setMessage({ kind: "err", text: result.error });
        setSecondsLeft(cd);
      }
    });
  };

  const disabled = !email || pending || secondsLeft > 0;
  const label = pending
    ? "Sending…"
    : secondsLeft > 0
      ? `Resend in ${formatRemaining(secondsLeft)}`
      : "Resend verification email";

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          ...ghostButtonStyle,
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {label}
      </button>
      {message && (
        <div
          aria-live="polite"
          style={{
            marginTop: 8,
            fontSize: 11,
            textAlign: "center",
            lineHeight: 1.5,
            color:
              message.kind === "ok"
                ? "var(--c-success)"
                : "var(--c-danger)",
          }}
        >
          {message.text}
        </div>
      )}
    </>
  );
}
