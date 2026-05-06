"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Mark all of the current user's notifications as read.
 *
 * Called from a client effect on /dashboard/notifications mount, NOT from
 * server-component render — Next 16 disallows revalidatePath during render
 * and crashes the page if you try.
 *
 * Idempotent: the WHERE filter only touches `read = false` rows so repeat
 * visits don't bounce updated_at on already-read rows.
 */
export async function markAllNotificationsReadAction(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

  // Refresh the dashboard layout so the sidebar's unread count drops to 0.
  revalidatePath("/dashboard", "layout");
}
