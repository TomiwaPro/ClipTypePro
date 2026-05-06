"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldErrorStyle,
  fieldInputStyle,
  fieldLabelStyle,
  ghostButtonStyle,
  primaryButtonStyle,
} from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import {
  signInAction,
  signInWithGoogleAction,
} from "@/lib/auth/actions";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (values: LoginInput) => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("email", values.email);
      fd.append("password", values.password);
      const result = await signInAction(fd);
      // signInAction redirects on success; only reaches here on failure.
      if (result && !result.ok) setServerError(result.error);
    });
  };

  const onGoogle = () => {
    setServerError(null);
    startTransition(async () => {
      const r = await signInWithGoogleAction();
      if (r && !r.ok) setServerError(r.error);
    });
  };

  return (
    <>
      <button
        type="button"
        style={{ ...ghostButtonStyle, marginBottom: 16 }}
        onClick={onGoogle}
        disabled={pending}
      >
        <span style={{ fontWeight: 700, fontSize: 15 }}>G</span>
        Continue with Google
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
        <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--c-border)" }} />
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label htmlFor="email" style={fieldLabelStyle}>
              Email
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
          </div>

          <div>
            <label htmlFor="password" style={fieldLabelStyle}>
              Password
            </label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="••••••••"
              hasError={Boolean(errors.password)}
              {...register("password")}
            />
            {errors.password && (
              <div style={fieldErrorStyle}>{errors.password.message}</div>
            )}
          </div>
        </div>

        {serverError && (
          <div
            role="alert"
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "var(--c-danger)",
              background:
                "color-mix(in srgb, var(--c-danger) 10%, transparent)",
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
          {pending ? "Signing you in…" : "Sign in →"}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Link
          href="/forgot-password"
          style={{ fontSize: 12, color: "var(--c-primary)" }}
        >
          Forgot password?
        </Link>
      </div>
    </>
  );
}
