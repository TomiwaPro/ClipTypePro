import { StubPage } from "@/components/dashboard/stub-page";
import { getTier } from "@/lib/dashboard/get-tier";

export default async function ApiPage() {
  const tier = await getTier();
  return (
    <StubPage
      title="API Portal"
      subtitle="Integrate ClipType's typing engine into your products"
      comingIn="Step 9"
      proLocked
      isFree={tier === "free"}
      bullets={[
        "Generate / revoke API keys (sha-256 hashed at rest)",
        "Quick-start curl + JS / Python snippets",
        "Usage counters (today / month) against the 10k Pro cap",
        "Webhook events for typing.complete / typing.failed",
      ]}
    />
  );
}
