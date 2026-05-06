import { StubPage } from "@/components/dashboard/stub-page";

export default function TyperPage() {
  return (
    <StubPage
      title="Clipboard Typer"
      subtitle="Copy → auto-types character by character into any app"
      comingIn="Step 6"
      bullets={[
        "Read clipboard content (with permission)",
        "Speed presets: Stealth, Human, Balanced, Fast, Instant",
        "Live WPM, character count, progress bar",
        "Pause / resume / stop while typing",
        "Free-tier 1,000 character limit; Pro unlocks unlimited",
      ]}
    />
  );
}
