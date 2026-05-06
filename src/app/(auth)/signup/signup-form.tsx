"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldErrorStyle,
  fieldInputStyle,
  fieldLabelStyle,
  ghostButtonStyle,
  primaryButtonStyle,
} from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrengthMeter } from "@/components/auth/password-strength";
import {
  signInWithGoogleAction,
  signUpAction,
} from "@/lib/auth/actions";
import {
  signupSchema,
  USE_CASES,
  type SignupInput,
} from "@/lib/auth/schemas";

export function SignupForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      useCase: "",
      agreeTos: false as unknown as true,
      agreeAcademic: false as unknown as true,
    },
  });

  const password = useWatch({ control, name: "password" }) ?? "";

  const onSubmit = (values: SignupInput) => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("fullName", values.fullName);
      fd.append("email", values.email);
      fd.append("password", values.password);
      fd.append("useCase", values.useCase);
      if (values.agreeTos) fd.append("agreeTos", "on");
      if (values.agreeAcademic) fd.append("agreeAcademic", "on");
      const result = await signUpAction(fd);
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
            <label htmlFor="fullName" style={fieldLabelStyle}>
              Full name
            </label>
            <input
              id="fullName"
              autoComplete="name"
              placeholder="Your name"
              style={fieldInputStyle(Boolean(errors.fullName))}
              aria-invalid={Boolean(errors.fullName)}
              {...register("fullName")}
            />
            {errors.fullName && (
              <div style={fieldErrorStyle}>{errors.fullName.message}</div>
            )}
          </div>

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
              autoComplete="new-password"
              placeholder="Create a password (8+ chars, mixed case, number)"
              hasError={Boolean(errors.password)}
              {...register("password")}
            />
            <PasswordStrengthMeter value={password} />
            {errors.password && (
              <div style={fieldErrorStyle}>{errors.password.message}</div>
            )}
          </div>

          <div>
            <label htmlFor="useCase" style={fieldLabelStyle}>
              Primary use case
            </label>
            <select
              id="useCase"
              style={fieldInputStyle(Boolean(errors.useCase))}
              aria-invalid={Boolean(errors.useCase)}
              {...register("useCase")}
            >
              <option value="">Select one…</option>
              {USE_CASES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            {errors.useCase && (
              <div style={fieldErrorStyle}>{errors.useCase.message}</div>
            )}
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 12,
              color: "var(--c-text-dim)",
              lineHeight: 1.5,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              {...register("agreeTos")}
              style={{
                marginTop: 3,
                accentColor: "var(--c-primary)",
                width: 14,
                height: 14,
              }}
            />
            <span>
              I agree to the{" "}
              <Link
                href="/tos"
                style={{ color: "var(--c-primary)" }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                style={{ color: "var(--c-primary)" }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          {errors.agreeTos && (
            <div style={fieldErrorStyle}>{errors.agreeTos.message}</div>
          )}

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 12,
              color: "var(--c-text-dim)",
              lineHeight: 1.5,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              {...register("agreeAcademic")}
              style={{
                marginTop: 3,
                accentColor: "var(--c-primary)",
                width: 14,
                height: 14,
              }}
            />
            <span>
              I confirm I will <strong>not</strong> use ClipType Pro to cheat in
              academic examinations.
            </span>
          </label>
          {errors.agreeAcademic && (
            <div style={fieldErrorStyle}>{errors.agreeAcademic.message}</div>
          )}
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
          {pending ? "Creating account…" : "Create account →"}
        </button>
      </form>
    </>
  );
}
