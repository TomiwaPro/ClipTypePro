import { redirect } from "next/navigation";
import { TyperClient } from "@/components/dashboard/typer/typer-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Real Step 6 typing engine. Server component handles all DB reads
 * (tier + platform list); the engine itself is a thick client component.
 */
export default async function TyperPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: platforms }] = await Promise.all([
    supabase.from("profiles").select("tier").eq("id", user.id).single(),
    supabase
      .from("platform_ratings")
      .select("name, category, risk_level")
      .order("name"),
  ]);

  const tier = (profile?.tier ?? "free") as
    | "free"
    | "pro"
    | "teams"
    | "enterprise";

  return (
    <TyperClient
      tier={tier}
      platforms={(platforms ?? []).map((p) => ({
        name: p.name as string,
        category: p.category as string,
        riskLevel: p.risk_level as "green" | "yellow" | "red",
      }))}
    />
  );
}
