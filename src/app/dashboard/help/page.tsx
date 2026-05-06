import { StubPage } from "@/components/dashboard/stub-page";

export default function HelpPage() {
  return (
    <StubPage
      title="Help & Documentation"
      subtitle="Guides, keyboard shortcuts, support"
      comingIn="Step 9"
      bullets={[
        "Searchable help articles",
        "Cheat-sheet of keyboard shortcuts",
        "Live chat (working hours) + email fallback",
        "Quick links to Status, Security, Privacy",
      ]}
    />
  );
}
