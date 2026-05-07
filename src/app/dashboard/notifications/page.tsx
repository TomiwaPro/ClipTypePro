import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  type Notification,
  NotificationsClient,
} from "@/components/dashboard/notifications/notifications-client";

export const dynamic = "force-dynamic";

/**
 * Notifications page — full list of the user's notifications, newest
 * first. Click a row to mark it read; "Mark all read" clears the lot.
 *
 * RLS scopes the select to auth.uid(); the actions also pin user_id.
 * Mutations revalidate the dashboard layout so the sidebar badge
 * re-fetches.
 */
export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, read, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div
        className="fade-up"
        style={{
          maxWidth: 600,
          background: "var(--c-surface)",
          border:
            "1px solid color-mix(in srgb, var(--c-danger) 33%, transparent)",
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
          Could not load notifications
        </div>
        <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
          {error.message}
        </div>
      </div>
    );
  }

  const notifications = (data ?? []).map((n) => ({
    id: n.id as string,
    type: n.type as Notification["type"],
    title: n.title as string,
    message: n.message as string,
    read: n.read as boolean,
    createdAt: n.created_at as string,
  }));

  return <NotificationsClient initial={notifications} />;
}
