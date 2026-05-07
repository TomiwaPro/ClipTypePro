import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComplianceClient } from "@/components/dashboard/compliance/compliance-client";
import { StubPage } from "@/components/dashboard/stub-page";

export const dynamic = "force-dynamic";

/**
 * Compliance — toggles persist to profiles via migration 005's columns.
 * Pro-locked: free users see the upgrade panel.
 */
export default async function CompliancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, compliance_mode, hipaa_baa_accepted, gdpr_dpa_accepted")
    .eq("id", user.id)
    .single();
  const tier = (profile?.tier ?? "free") as
    | "free"
    | "pro"
    | "teams"
    | "enterprise";

  if (tier === "free") {
    return (
      <StubPage
        title="Compliance Mode"
        subtitle="HIPAA · GDPR · SOC 2 · enterprise audit controls"
        comingIn="Pro plan"
        proLocked
        isFree
        bullets={[
          "Compliance Mode toggle gates audit-log retention",
          "HIPAA BAA + GDPR DPA acknowledgements",
          "Submit GDPR data subject rights requests in-app",
          "Export your typing-sessions audit log as JSON",
        ]}
      />
    );
  }

  return (
    <ComplianceClient
      complianceMode={Boolean(profile?.compliance_mode)}
      hipaaBaa={Boolean(profile?.hipaa_baa_accepted)}
      gdprDpa={Boolean(profile?.gdpr_dpa_accepted)}
    />
  );
}
