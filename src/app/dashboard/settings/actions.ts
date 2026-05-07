"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions for the settings page.
 *
 * All mutations write the user's own row only — RLS would block any
 * other id, but we still pin .eq("id", user.id) defensively.
 *
 * Two layers of revalidation:
 *   - Profile-shape changes (full_name, theme, typing/notif prefs)
 *     revalidate the dashboard *layout* so the topbar avatar /
 *     sidebar tier display refresh.
 *   - Snippet deletes revalidate /dashboard/snippets so the list
 *     reflects the wipe on next nav.
 */

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name is too long"),
});

export async function updateProfileAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export async function updateEmailAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }> {
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  if (parsed.data.email.toLowerCase() === (user.email ?? "").toLowerCase()) {
    return { ok: true };
  }

  // Supabase fires a confirmation email to the new address. The auth
  // user's email only flips after the user clicks the link — until
  // then `auth.users.email` stays the old one. profile.email is
  // synced lazily on settings-page load (see SettingsPage).
  const { error } = await supabase.auth.updateUser({
    email: parsed.data.email,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, needsConfirmation: true };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
  });

export async function updatePasswordAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false, error: "Not authenticated" };

  // Verify the current password by attempting a fresh signin. Supabase's
  // updateUser({ password }) accepts a new password without re-checking
  // the old one; we add the check ourselves to match user expectations.
  const { error: signinErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (signinErr) {
    return { ok: false, error: "Current password is incorrect" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

const themeSchema = z.object({
  theme: z.enum(["dark", "light"]),
});

export async function updateThemePreferenceAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = themeSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid theme" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ theme_preference: parsed.data.theme })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

const typingSettingsSchema = z.object({
  typo_simulation: z.boolean(),
  pause_on_focus: z.boolean(),
  auto_clear: z.boolean(),
  show_wpm: z.boolean(),
  countdown_seconds: z.number().int().min(0).max(10),
  default_speed: z.enum(["stealth", "human", "balanced", "fast", "instant"]),
  human_mode: z.boolean(),
});

export async function updateTypingSettingsAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = typingSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid setting",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ typing_settings: parsed.data })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

const notifPrefsSchema = z.object({
  email_billing: z.boolean(),
  email_security: z.boolean(),
  email_product_updates: z.boolean(),
  in_app_alerts: z.boolean(),
  in_app_platform_warnings: z.boolean(),
});

export async function updateNotificationPrefsAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = notifPrefsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid setting",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ notification_preferences: parsed.data })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function deleteAllSnippetsAction(): Promise<{
  ok: boolean;
  error?: string;
  deleted?: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error, count } = await supabase
    .from("snippets")
    .delete({ count: "exact" })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/snippets");
  return { ok: true, deleted: count ?? 0 };
}

export async function exportUserDataAction(): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Pull every user-owned row in parallel. RLS scopes each table to
  // auth.uid() so we don't have to filter per-table for safety; we
  // do anyway to be explicit and to make the query plans obvious.
  const [profile, snippets, sessions, notifications] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single(),
    supabase
      .from("snippets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("typing_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (profile.error) return { ok: false, error: profile.error.message };

  return {
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
      },
      profile: profile.data,
      snippets: snippets.data ?? [],
      typingSessions: sessions.data ?? [],
      notifications: notifications.data ?? [],
    },
  };
}
