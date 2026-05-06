import { StubPage } from "@/components/dashboard/stub-page";

export default function PlatformsPage() {
  return (
    <StubPage
      title="Platform Risk Ratings"
      subtitle="25 platforms rated for typing-detection risk"
      comingIn="Step 7"
      bullets={[
        "Search + filter by green / yellow / red risk",
        "Auto-warn before typing on red-rated platforms",
        "Pull the seeded platform_ratings table (already populated)",
        "Tap a row → see notes, recommended speed mode",
      ]}
    />
  );
}
