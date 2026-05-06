"use client";

import { useEffect, useState, useTransition } from "react";
import { ghostButtonStyle } from "@/components/auth/auth-card";
import { resendConfirmationAction } from "@/lib/auth/actions";

const COOLDOWN_SECONDS = 60;

export function ResendButton({ email }: { email: string }) {
  // 0 = enabled, >0 = disabled (showing remaining seconds)
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  // Countdown ticker — pure DOM side-effect, no setState-in-render concerns.
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
        setMessage({ kind: "ok", text: "Sent! Check your inbox again." });
        setSecondsLeft(COOLDOWN_SECONDS);
      } else {
        setMessage({ kind: "err", text: result.error });
      }
    });
  };

  const disabled = !email || pending || secondsLeft > 0;
  const label = pending
    ? "Sending…"
    : secondsLeft > 0
      ? `Resend in ${secondsLeft}s`
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
