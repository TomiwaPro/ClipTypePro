"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { mapAuthError } from "./error-map";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "./schemas";

// ─── Result shape returned by every action ───────────────────────────────────
export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function fieldErrorsFromZod<T extends Record<string, unknown>>(
  parsed: { error: { issues: { path: PropertyKey[]; message: string }[] } } & {
    success: false;
  },
): { ok: false; error: string; fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0]?.toString() ?? "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  void ({} as T);
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}

// ─── Sign in ─────────────────────────────────────────────────────────────────
export async function signInAction(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fieldErrorsFromZod(parsed);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: mapAuthError(error) };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// ─── Sign up ─────────────────────────────────────────────────────────────────
export async function signUpAction(formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    useCase: formData.get("useCase"),
    agreeTos: formData.get("agreeTos") === "on",
    agreeAcademic: formData.get("agreeAcademic") === "on",
  });
  if (!parsed.success) return fieldErrorsFromZod(parsed);

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        use_case: parsed.data.useCase,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { ok: false, error: mapAuthError(error) };

  // If Supabase returned a session, the project has "Confirm email" OFF —
  // user is already authenticated. Skip the verify-email holding pen.
  // Otherwise route to the verification page so they can resend if needed.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }
  redirect(`/auth/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
}

// ─── Sign in with Google (OAuth) ─────────────────────────────────────────────
export async function signInWithGoogleAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { ok: false, error: mapAuthError(error) };
  if (data?.url) redirect(data.url);
  return { ok: false, error: "OAuth provider returned no redirect URL." };
}

// ─── Sign out ────────────────────────────────────────────────────────────────
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// ─── Forgot password ─────────────────────────────────────────────────────────
export async function forgotPasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return fieldErrorsFromZod(parsed);

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // Intentionally don't reveal whether the email exists in the system.
  // Treat the action as successful even if the email is unknown.
  if (error && error.code !== "user_not_found") {
    return { ok: false, error: mapAuthError(error) };
  }
  return { ok: true, data: { sentTo: parsed.data.email } };
}

// ─── Resend confirmation email ───────────────────────────────────────────────
export async function resendConfirmationAction(
  email: string,
): Promise<ActionResult<{ cooldownSeconds: number }>> {
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Missing email address." };
  }
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
  });
  if (error) {
    // Pass the parsed cooldown back to the UI so the button waits the right
    // number of seconds (60s for per-email, 3600s for per-project).
    const { cooldownForError } = await import("./error-map");
    const cooldown = cooldownForError(error) ?? 0;
    return {
      ok: false,
      error: mapAuthError(error),
      fieldErrors: cooldown
        ? { _cooldown: [String(cooldown)] }
        : undefined,
    };
  }
  // Successful resend → standard 60s cooldown.
  return { ok: true, data: { cooldownSeconds: 60 } };
}

// ─── Update password (after reset email click → /reset-password) ─────────────
export async function updatePasswordAction(formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return fieldErrorsFromZod(parsed);

  const supabase = await createClient();
  // The user must already be in a recovery session (came from email link
  // through /auth/callback). updateUser will fail if no session exists.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: mapAuthError(error) };

  await supabase.auth.signOut();
  redirect("/login?reset=success");
}
