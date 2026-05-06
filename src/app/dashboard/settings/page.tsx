import { StubPage } from "@/components/dashboard/stub-page";

export default function SettingsPage() {
  return (
    <StubPage
      title="Settings"
      subtitle="Preferences and account controls"
      comingIn="Step 7"
      bullets={[
        "Theme preference (persists across devices via profiles.theme_preference)",
        "Typing behaviour: typo simulation, pause on focus, countdown duration",
        "Notification preferences (email + in-app, JSONB-backed)",
        "Privacy & data: export, delete account",
      ]}
    />
  );
}
