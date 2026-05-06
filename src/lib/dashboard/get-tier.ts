import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Read just the user's tier — used by Pro-locked stub pages to decide
 * whether to show the lock banner. The dashboard layout already loads
 * the full profile, but layout state isn't readable from page server
 * components, so we re-query (cheap — single column, indexed PK).
 */
export async function getTier(): Promise<"free" | "pro" | "teams" | "enterprise"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "free";

  const { data } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();
  return (data?.tier ?? "free") as "free" | "pro" | "teams" | "enterprise";
}
