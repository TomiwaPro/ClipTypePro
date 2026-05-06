import { revalidatePath } from "next/cache";
import { StubPage } from "@/components/dashboard/stub-page";
import { createClient } from "@/lib/supabase/server";

/**
 * Notifications page (placeholder).
 *
 * Even though the rich list ships in Step 7, we already mark all of the
 * user's notifications as read on visit so the unread badge in the
 * sidebar visibly clears. This is the behaviour the verification spec
 * called out:
 *
 *   "Clicking Notifications: badge disappears (count goes to 0)"
 *
 * Marking-read is idempotent (`update ... where read = false`) so
 * repeated visits don't bounce the row's updated_at.
 */
export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    // Invalidate the layout so the sidebar's unread count refreshes.
    revalidatePath("/dashboard", "layout");
  }

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
