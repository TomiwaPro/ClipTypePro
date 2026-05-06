import { StubPage } from "@/components/dashboard/stub-page";
import { getTier } from "@/lib/dashboard/get-tier";

export default async function TeamPage() {
  const tier = await getTier();
  return (
    <StubPage
      title="Team Management"
      subtitle="Manage members, roles, and shared snippets"
      comingIn="Step 7"
      proLocked
      isFree={tier === "free"}
      bullets={[
        "Invite by email (with role: admin / member / viewer)",
        "Per-member sessions, characters typed, last active",
        "Shared snippet library (powered by team_members RLS)",
        "Audit log export",
      ]}
    />
  );
}
