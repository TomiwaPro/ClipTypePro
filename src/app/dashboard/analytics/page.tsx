import { StubPage } from "@/components/dashboard/stub-page";

export default function AnalyticsPage() {
  return (
    <StubPage
      title="Analytics"
      subtitle="Your typing performance overview"
      comingIn="Step 7"
      bullets={[
        "Characters typed, sessions, avg WPM, time saved",
        "WPM-over-time chart (recharts)",
        "Top snippets by use-count",
        "7d / 30d / 90d range selector",
      ]}
    />
  );
}
