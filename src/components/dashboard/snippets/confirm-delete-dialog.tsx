"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteSnippetAction } from "@/app/dashboard/snippets/actions";

/**
 * Destructive confirm — explicit two-button affirmation before delete.
 * Mirrors the v4 prototype's pattern. Closes itself on success.
 */
export function ConfirmDeleteDialog({
  open,
  snippetId,
  snippetTitle,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  snippetId: string | null;
  snippetTitle: string | null;
  onOpenChange: (next: boolean) => void;
  onDeleted: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    if (!snippetId) return;
    startTransition(async () => {
      const result = await deleteSnippetAction(snippetId);
      if (result.ok) {
        toast.success("Snippet deleted", { description: snippetTitle ?? undefined });
        onDeleted();
        onOpenChange(false);
      } else {
        toast.error("Couldn't delete snippet", { description: result.error });
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
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
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
            maxWidth: 380,
            background: "var(--c-surface)",
            border:
              "1px solid color-mix(in srgb, var(--c-danger) 33%, transparent)",
            borderRadius: 12,
            padding: 22,
            color: "var(--c-text)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 10 }}>⚠️</div>
          <Dialog.Title
            style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}
          >
            Delete snippet?
          </Dialog.Title>
          <Dialog.Description
            style={{
              fontSize: 13,
              color: "var(--c-text-dim)",
              lineHeight: 1.65,
              marginBottom: 18,
            }}
          >
            {snippetTitle ? (
              <>
                Permanently delete{" "}
                <strong style={{ color: "var(--c-text)" }}>
                  &ldquo;{snippetTitle}&rdquo;
                </strong>
                ? This cannot be undone.
              </>
            ) : (
              <>This snippet will be permanently deleted. This cannot be undone.</>
            )}
          </Dialog.Description>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              style={{
                padding: "8px 14px",
                borderRadius: 7,
                background:
                  "color-mix(in srgb, var(--c-danger) 20%, transparent)",
                color: "var(--c-danger)",
                border:
                  "1px solid color-mix(in srgb, var(--c-danger) 40%, transparent)",
                fontWeight: 600,
                fontSize: 12,
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.6 : 1,
                fontFamily: "var(--font-sans)",
              }}
            >
              {pending ? "Deleting…" : "Delete"}
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
