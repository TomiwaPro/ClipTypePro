import { StubPage } from "@/components/dashboard/stub-page";
import { getTier } from "@/lib/dashboard/get-tier";

export default async function CompliancePage() {
  const tier = await getTier();
  return (
    <StubPage
      title="Compliance Mode"
      subtitle="HIPAA · GDPR · SOC 2 · enterprise audit controls"
      comingIn="Step 7"
      proLocked
      isFree={tier === "free"}
      bullets={[
        "Compliance Mode toggle: enables full audit logging",
        "HIPAA BAA + GDPR DPA toggles",
        "GDPR data subject rights (access / erasure / portability)",
        "Audit log JSON export",
      ]}
    />
  );
}
