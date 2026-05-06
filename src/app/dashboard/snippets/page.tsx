import { redirect } from "next/navigation";
import {
  type Snippet,
  SnippetsClient,
} from "@/components/dashboard/snippets/snippets-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Snippet library page.
 *
 * Server-fetches the user's snippets (RLS scopes to auth.uid()) and hands
 * the list to the client for filter/search/CRUD interactions. Mutations
 * happen via server actions which `revalidatePath` this segment, so the
 * next render pulls fresh data automatically.
 */
export default async function SnippetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("snippets")
    .select("id, title, category, content, use_count, created_at")
    .order("created_at", { ascending: false });

  // RLS guarantees we only get this user's rows. If there's a transport
  // error we render the empty state with an inline note rather than
  // crashing the page — gives the user a path forward.
  if (error) {
    return (
      <div
        className="fade-up"
        style={{
          maxWidth: 600,
          background: "var(--c-surface)",
          border:
            "1px solid color-mix(in srgb, var(--c-danger) 33%, transparent)",
          borderRadius: 10,
          padding: 18,
          color: "var(--c-text)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
          Could not load snippets
        </div>
        <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
          {error.message}
        </div>
      </div>
    );
  }

  const snippets = (data ?? []) as Snippet[];
  return <SnippetsClient snippets={snippets} />;
}
