"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldErrorStyle,
  fieldInputStyle,
  fieldLabelStyle,
  primaryButtonStyle,
} from "@/components/auth/auth-card";
import { forgotPasswordAction } from "@/lib/auth/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/auth/schemas";

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
    defaultValues: { email: "" },
  });

  const onSubmit = (values: ForgotPasswordInput) => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("email", values.email);
      const result = await forgotPasswordAction(fd);
      if (result.ok) {
        setSentTo(values.email);
      } else {
        setServerError(result.error);
      }
    });
  };

  if (sentTo) {
    return (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          Check your inbox
        </div>
        <p
          style={{
            color: "var(--c-text-dim)",
            fontSize: 13,
            lineHeight: 1.65,
            marginBottom: 14,
          }}
        >
          If an account exists for{" "}
          <strong style={{ color: "var(--c-text)" }}>{sentTo}</strong>, we sent a
          reset link. It expires in 30 minutes.
        </p>
        <div
          style={{
            background: "var(--c-surface-b)",
            border: "1px solid var(--c-border)",
            borderRadius: 8,
            padding: 12,
            textAlign: "left",
            fontSize: 11,
            color: "var(--c-text-dim)",
            display: "grid",
            gap: 6,
          }}
        >
          {[
            "Check spam/junk if you don't see it",
            "The link expires in 30 minutes",
            "Contact support if you still can't get in",
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 7 }}>
              <span style={{ color: "var(--c-success)" }}>✓</span>
              {t}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <label htmlFor="email" style={fieldLabelStyle}>
        Email address
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        style={fieldInputStyle(Boolean(errors.email))}
        aria-invalid={Boolean(errors.email)}
        {...register("email")}
      />
      {errors.email && (
        <div style={fieldErrorStyle}>{errors.email.message}</div>
      )}

      {serverError && (
        <div
          role="alert"
          style={{
            marginTop: 14,
            fontSize: 12,
            color: "var(--c-danger)",
            background: "color-mix(in srgb, var(--c-danger) 10%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--c-danger) 35%, transparent)",
            padding: "10px 12px",
            borderRadius: 7,
          }}
        >
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid || pending}
        style={{ ...primaryButtonStyle(pending), marginTop: 18 }}
      >
        {pending ? "Sending…" : "Send reset link →"}
      </button>
    </form>
  );
}
