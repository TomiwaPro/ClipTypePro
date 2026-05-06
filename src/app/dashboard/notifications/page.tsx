import { StubPage } from "@/components/dashboard/stub-page";

export default function NotificationsPage() {
  return (
    <StubPage
      title="Notifications"
      subtitle="Alerts, billing events, system messages"
      comingIn="Step 7"
      bullets={[
        "Real notifs from the notifications table",
        "Unread badge already wired in the sidebar",
        "Mark single / all as read",
        "Filter by type: alert / billing / system / team",
      ]}
    />
  );
}
