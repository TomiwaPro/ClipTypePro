import { StubPage } from "@/components/dashboard/stub-page";
import { MarkAsReadOnMount } from "./mark-as-read";

/**
 * Notifications page (placeholder).
 *
 * The real list ships in Step 7. For now we already mark everything as
 * read on visit so the sidebar's unread badge clears, matching the
 * verified Step 5 behaviour.
 *
 * The mark-read side effect runs from a client component (`useEffect`)
 * because Next 16 forbids `revalidatePath` during server render. The
 * server action is invoked from the effect, updates DB, and revalidates
 * the dashboard layout to refresh the sidebar count.
 */
export default function NotificationsPage() {
  return (
    <>
      <MarkAsReadOnMount />
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
    </>
  );
}
