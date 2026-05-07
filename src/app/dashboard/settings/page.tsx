import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type NotificationPreferences,
  SettingsClient,
  type TypingSettings,
} from "@/components/dashboard/settings/settings-client";

export const dynamic = "force-dynamic";

const DEFAULT_TYPING: TypingSettings = {
  typo_simulation: true,
  pause_on_focus: true,
  auto_clear: false,
  show_wpm: true,
  countdown_seconds: 3,
  default_speed: "human",
  human_mode: true,
};

const DEFAULT_NOTIF: NotificationPreferences = {
  email_billing: true,
  email_security: true,
  email_product_updates: false,
  in_app_alerts: true,
  in_app_platform_warnings: true,
};

/**
 * Settings page — pre-populated from the user's profile row.
 *
 * Email-change confirmation lag: when the user updates their email, the
 * confirmation link Supabase sends doesn't fire any of our webhooks.
 * `auth.users.email` flips when the link is clicked, but `profiles.email`
 * stays stale. We do a one-shot reconciliation on every settings load:
 * if the auth email and profile email differ, sync via the service-role
 * client (RLS would block a normal update on profiles.email).
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, email, theme_preference, typing_settings, notification_preferences",
    )
    .eq("id", user.id)
    .single();

  // Reconcile profile.email with auth.users.email if they drifted (the
  // user confirmed an email change since the last settings load).
  if (profile && user.email && profile.email !== user.email) {
    try {
      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({ email: user.email })
        .eq("id", user.id);
      profile.email = user.email;
    } catch {
      /* non-fatal — UI shows the current auth email; profile.email stays
         stale until next reconciliation */
    }
  }

  const typing = (profile?.typing_settings as TypingSettings | null) ?? null;
  const notif =
    (profile?.notification_preferences as NotificationPreferences | null) ??
    null;

  return (
    <SettingsClient
      fullName={(profile?.full_name as string | null) ?? ""}
      email={user.email ?? ""}
      themePreference={
        (profile?.theme_preference as "dark" | "light" | null) ?? "dark"
      }
      typingSettings={{ ...DEFAULT_TYPING, ...(typing ?? {}) }}
      notificationPreferences={{ ...DEFAULT_NOTIF, ...(notif ?? {}) }}
    />
  );
}
