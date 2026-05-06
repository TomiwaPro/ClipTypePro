"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  createSnippetAction,
  SNIPPET_CATEGORIES,
  updateSnippetAction,
} from "@/app/dashboard/snippets/actions";

/**
 * Create-or-edit snippet modal.
 *
 * Mode is implicit from the `snippet` prop: undefined → create,
 * defined → edit (form pre-fills with existing values).
 *
 * Re-priming defaults is handled at the *parent* via a `key` prop —
 * remounting beats useEffect-with-reset for derived initial state and
 * keeps the React 19 hook compiler happy (no setState-in-effect).
 *
 * Validates client-side via the same zod schema the server action uses,
 * so the UX feedback is fast and the server stays the source of truth.
 */

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(80),
  category: z.enum(SNIPPET_CATEGORIES),
  content: z.string().min(1, "Content is required").max(10_000),
});
type FormInput = z.infer<typeof formSchema>;

export type EditingSnippet = {
  id: string;
  title: string;
  category: string;
  content: string;
};

export function SnippetFormModal({
  open,
  onOpenChange,
  snippet,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  snippet?: EditingSnippet;
}) {
  const isEdit = Boolean(snippet);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormInput>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      title: snippet?.title ?? "",
      category:
        (snippet?.category as (typeof SNIPPET_CATEGORIES)[number]) ?? "General",
      content: snippet?.content ?? "",
    },
  });

  const onSubmit = (values: FormInput) => {
    setServerError(null);
    startTransition(async () => {
      const result =
        isEdit && snippet
          ? await updateSnippetAction(snippet.id, values)
          : await createSnippetAction(values);

      if (result.ok) {
        toast.success(isEdit ? "Snippet updated" : "Snippet saved", {
          description: values.title,
        });
        onOpenChange(false);
      } else {
        setServerError(result.error);
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 5001,
            width: "calc(100% - 40px)",
            maxWidth: 500,
            maxHeight: "calc(100vh - 40px)",
            overflowY: "auto",
            background: "var(--c-surface)",
            border:
              "1px solid color-mix(in srgb, var(--c-primary) 33%, transparent)",
            borderRadius: 12,
            padding: 22,
            color: "var(--c-text)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Dialog.Title
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--c-primary)",
              }}
            >
              {isEdit ? "Edit snippet" : "New snippet"}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--c-text-muted)",
                  cursor: "pointer",
                  padding: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description
            style={{ position: "absolute", left: -9999, height: 0 }}
          >
            {isEdit
              ? "Update the title, category, or body of this snippet."
              : "Add a new reusable snippet to your library."}
          </Dialog.Description>

          <form noValidate onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <Label>Title</Label>
                <input
                  {...register("title")}
                  placeholder="Snippet name…"
                  autoFocus
                  style={inputStyle(Boolean(errors.title))}
                  aria-invalid={Boolean(errors.title)}
                />
                {errors.title && <ErrorText>{errors.title.message}</ErrorText>}
              </div>
              <div>
                <Label>Category</Label>
                <select
                  {...register("category")}
                  style={inputStyle(Boolean(errors.category))}
                >
                  {SNIPPET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <ErrorText>{errors.category.message}</ErrorText>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <Label>Content</Label>
              <textarea
                {...register("content")}
                placeholder="Snippet content…"
                spellCheck={false}
                style={{
                  ...inputStyle(Boolean(errors.content)),
                  minHeight: 140,
                  fontFamily: "var(--font-mono)",
                  resize: "vertical",
                  lineHeight: 1.6,
                }}
              />
              {errors.content && (
                <ErrorText>{errors.content.message}</ErrorText>
              )}
            </div>

            {serverError && (
              <div
                role="alert"
                style={{
                  marginBottom: 10,
                  padding: "10px 12px",
                  borderRadius: 7,
                  background: "color-mix(in srgb, var(--c-danger) 12%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--c-danger) 35%, transparent)",
                  color: "var(--c-danger)",
                  fontSize: 12,
                }}
              >
                {serverError}
              </div>
            )}

            <div style={{ display: "flex", gap: 7 }}>
              <button
                type="submit"
                disabled={!isValid || pending}
                style={{
                  padding: "8px 14px",
                  borderRadius: 7,
                  background: "var(--c-primary)",
                  color: "#000",
                  border: "none",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: pending || !isValid ? "not-allowed" : "pointer",
                  opacity: pending || !isValid ? 0.6 : 1,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {pending
                  ? isEdit
                    ? "Updating…"
                    : "Saving…"
                  : isEdit
                    ? "Save changes"
                    : "Save snippet"}
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={pending}
                style={{
                  padding: "8px 14px",
                  borderRadius: 7,
                  background: "var(--c-surface-b)",
                  color: "var(--c-text-dim)",
                  border: "1px solid var(--c-border)",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "block",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.2,
        color: "var(--c-text-muted)",
        textTransform: "uppercase",
        marginBottom: 5,
      }}
    >
      {children}
    </span>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: "var(--c-danger)", marginTop: 4 }}>
      {children}
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    background: "var(--c-surface-b)",
    border: `1px solid ${hasError ? "var(--c-danger)" : "var(--c-border)"}`,
    borderRadius: 7,
    padding: "8px 10px",
    color: "var(--c-text)",
    fontFamily: "var(--font-sans)",
    fontSize: 12,
    boxSizing: "border-box",
    outline: "none",
  };
}
