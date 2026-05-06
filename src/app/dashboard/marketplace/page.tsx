import { StubPage } from "@/components/dashboard/stub-page";

export default function MarketplacePage() {
  return (
    <StubPage
      title="Snippet Marketplace"
      subtitle="Professional packs — buy once, type forever"
      comingIn="Step 7"
      bullets={[
        "Browse packs by category (Support, Dev, Healthcare, Legal, Sales, Email)",
        "Featured packs, ratings, reviews",
        "One-click install into your library",
        "Stripe checkout for paid packs (uses the Step 8 plumbing)",
      ]}
    />
  );
}
