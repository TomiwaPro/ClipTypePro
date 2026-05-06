import { z } from "zod";

/**
 * Plain constants + zod schema for snippets.
 *
 * MUST live in a file without `"use server"` because Next 15+ treats
 * every named export from a `"use server"` file as a server action,
 * which means non-function exports (arrays, schemas, types) come back
 * as opaque proxies on the client and can't be iterated. Importing
 * SNIPPET_CATEGORIES from actions.ts at runtime threw:
 *
 *   {imported module ./actions:…}.SNIPPET_CATEGORIES.map is not a function
 *
 * Splitting the constants out fixes it. actions.ts now imports from here.
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

export type SnippetCategory = (typeof SNIPPET_CATEGORIES)[number];

export const snippetSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(80, "Keep title under 80 characters"),
  category: z.enum(SNIPPET_CATEGORIES, { message: "Pick a category" }),
  content: z
    .string()
    .min(1, "Content is required")
    .max(10_000, "Snippet content can't exceed 10,000 characters"),
});

export type SnippetInput = z.infer<typeof snippetSchema>;

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
