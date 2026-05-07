import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasProAccess } from "@/lib/dashboard/access";
import { ComplianceClient } from "@/components/dashboard/compliance/compliance-client";
import { StubPage } from "@/components/dashboard/stub-page";

export const dynamic = "force-dynamic";

/**
 * Compliance — toggles persist to profiles via migration 005's columns.
 * Pro-locked, but the 14-day signup trial counts as Pro access (see
 * hasProAccess for the rationale).
 */
export default async function CompliancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "tier, trial_ends_at, subscription_status, compliance_mode, hipaa_baa_accepted, gdpr_dpa_accepted",
    )
    .eq("id", user.id)
    .single();

  if (!hasProAccess(profile ?? {})) {
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
