import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Profile is just a synonym for Settings for now — the avatar dropdown's
 * "Profile" menu item lands here, then bounces to Settings where the
 * actual editable fields live (theme, typing behaviour, etc.).
 *
 * Once we ship a separate read-only profile view (avatar upload, public
 * handle, etc.) this redirect goes away.
 */
export default async function ProfilePage() {
  // Defence in depth — middleware enforces auth on /dashboard/*, but if
  // anything ever bypasses it, don't crash on a null user.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  redirect("/dashboard/settings");
}
