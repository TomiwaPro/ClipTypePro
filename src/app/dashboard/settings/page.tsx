import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
 * Email sync: profiles.email stays in lockstep with auth.users.email
 * via the sync_profile_email trigger added in migration 004. The page
 * just reads user.email (the auth source of truth) for the input
 * default, so the form is always correct even if a confirmation link
 * was clicked between renders.
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, typing_settings, notification_preferences")
    .eq("id", user.id)
    .single();

  const typing = (profile?.typing_settings as TypingSettings | null) ?? null;
  const notif =
    (profile?.notification_preferences as NotificationPreferences | null) ??
    null;

  return (
    <SettingsClient
      fullName={(profile?.full_name as string | null) ?? ""}
      email={user.email ?? ""}
      typingSettings={{ ...DEFAULT_TYPING, ...(typing ?? {}) }}
      notificationPreferences={{ ...DEFAULT_NOTIF, ...(notif ?? {}) }}
    />
  );
}
