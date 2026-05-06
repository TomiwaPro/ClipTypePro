import { StubPage } from "@/components/dashboard/stub-page";

export default function SnippetsPage() {
  return (
    <StubPage
      title="Snippet Library"
      subtitle="Save, categorise and replay frequently-typed text"
      comingIn="Step 6"
      bullets={[
        "CRUD on personal snippets via Supabase RLS",
        "Categories: Support / Email / Dev / Healthcare / Legal / Sales / General",
        "Use-count analytics on each snippet",
        "Share to a team (Pro Teams) — already wired in the schema",
        "Export library as JSON",
      ]}
    />
  );
}
