"use client";

import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fieldErrorStyle,
  fieldLabelStyle,
  primaryButtonStyle,
} from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrengthMeter } from "@/components/auth/password-strength";
import { updatePasswordAction } from "@/lib/auth/actions";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/auth/schemas";

export function ResetPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = useWatch({ control, name: "password" }) ?? "";

  const onSubmit = (values: ResetPasswordInput) => {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("password", values.password);
      fd.append("confirmPassword", values.confirmPassword);
      const result = await updatePasswordAction(fd);
      // updatePasswordAction redirects on success; only reaches here on failure.
      if (result && !result.ok) setServerError(result.error);
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label htmlFor="password" style={fieldLabelStyle}>
            New password
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 8 chars, mixed case, number"
            hasError={Boolean(errors.password)}
            {...register("password")}
          />
          <PasswordStrengthMeter value={password} />
          {errors.password && (
            <div style={fieldErrorStyle}>{errors.password.message}</div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" style={fieldLabelStyle}>
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="Type it again"
            hasError={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <div style={fieldErrorStyle}>
              {errors.confirmPassword.message}
            </div>
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
        {pending ? "Updating…" : "Set new password →"}
      </button>
    </form>
  );
}
