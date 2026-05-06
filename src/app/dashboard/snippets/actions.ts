"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Snippet CRUD server actions.
 *
 * RLS on `snippets` enforces user_id = auth.uid(), so the client can't
 * forge ownership even if it lies about the row id. We re-validate the
 * inputs with zod for clear field-level errors.
 *
 * After every mutation we `revalidatePath('/dashboard/snippets')` so
 * the server-rendered list refreshes on the next render — no manual
 * client-side cache invalidation needed.
 */

export const SNIPPET_CATEGORIES = [
  "Support",
  "Email",
  "Dev",
  "Healthcare",
  "Legal",
  "Sales",
  "General",
] as const;

const baseSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(80, "Keep title under 80 characters"),
  category: z.enum(SNIPPET_CATEGORIES, {
    message: "Pick a category",
  }),
  content: z
    .string()
    .min(1, "Content is required")
    .max(10_000, "Snippet content can't exceed 10,000 characters"),
});

export type SnippetInput = z.infer<typeof baseSchema>;

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function fieldErrorsFromZod(parsed: {
  error: { issues: { path: PropertyKey[]; message: string }[] };
}): { ok: false; error: string; fieldErrors: Record<string, string[]> } {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0]?.toString() ?? "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}

// ─── CREATE ─────────────────────────────────────────────────────────────────
export async function createSnippetAction(
  input: SnippetInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return fieldErrorsFromZod(parsed);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { data, error } = await supabase
    .from("snippets")
    .insert({
      user_id: user.id,
      title: parsed.data.title.trim(),
      category: parsed.data.category,
      content: parsed.data.content,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/snippets");
  return { ok: true, data: { id: data.id as string } };
}

// ─── UPDATE ─────────────────────────────────────────────────────────────────
export async function updateSnippetAction(
  id: string,
  input: SnippetInput,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing snippet id." };
  const parsed = baseSchema.safeParse(input);
  if (!parsed.success) return fieldErrorsFromZod(parsed);

  const supabase = await createClient();
  const { error } = await supabase
    .from("snippets")
    .update({
      title: parsed.data.title.trim(),
      category: parsed.data.category,
      content: parsed.data.content,
    })
    .eq("id", id);
  // RLS narrows the WHERE to the calling user — if id doesn't belong to
  // them, no row updates and no error fires (consistent with PostgREST).
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/snippets");
  return { ok: true };
}

// ─── DELETE ─────────────────────────────────────────────────────────────────
export async function deleteSnippetAction(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing snippet id." };

  const supabase = await createClient();
  const { error } = await supabase.from("snippets").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/snippets");
  return { ok: true };
}

// ─── INCREMENT USE COUNT ─────────────────────────────────────────────────────
// Read-modify-write — a microscopic race window if the user clicks the same
// snippet twice in 50ms, but use_count is purely informational. Acceptable.
export async function incrementSnippetUseAction(
  id: string,
): Promise<ActionResult<{ useCount: number }>> {
  if (!id) return { ok: false, error: "Missing snippet id." };

  const supabase = await createClient();
  const { data: current, error: readErr } = await supabase
    .from("snippets")
    .select("use_count")
    .eq("id", id)
    .single();
  if (readErr) return { ok: false, error: readErr.message };

  const next = (current?.use_count ?? 0) + 1;
  const { error: writeErr } = await supabase
    .from("snippets")
    .update({ use_count: next })
    .eq("id", id);
  if (writeErr) return { ok: false, error: writeErr.message };

  revalidatePath("/dashboard/snippets");
  return { ok: true, data: { useCount: next } };
}
