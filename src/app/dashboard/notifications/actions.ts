"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions for the notifications page.
 *
 * Both mutations revalidate the dashboard *layout* so the sidebar's
 * unread badge re-fetches once the action settles. RLS scopes every
 * notification to the requesting user; we still pin the WHERE clause
 * to user_id as belt-and-braces.
 *
 * Idempotent: WHERE filters narrow to read=false rows so repeat calls
 * don't bounce updated_at unnecessarily.
 */

export async function markNotificationReadAction(
  rawId: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.string().uuid().safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Invalid notification id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
