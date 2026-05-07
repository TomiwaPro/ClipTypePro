"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import {
  generateApiKeyAction,
  regenerateApiKeyAction,
  revokeApiKeyAction,
} from "@/app/dashboard/api/actions";

export type ApiKeyRow = {
  id: string;
  prefix: string;
  label: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

type ConfirmAction =
  | { kind: "regenerate"; id: string; label: string | null }
  | { kind: "revoke"; id: string; label: string | null }
  | null;

type RevealedKey = {
  id: string;
  fullKey: string;
  prefix: string;
  reason: "generated" | "regenerated";
};

export function ApiClient({ initial }: { initial: ApiKeyRow[] }) {
  const [keys, setKeys] = useState<ApiKeyRow[]>(initial);
  const [labelInput, setLabelInput] = useState("");
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [reveal, setReveal] = useState<RevealedKey | null>(null);
  const [pending, startTransition] = useTransition();

  const onGenerate = () => {
    startTransition(async () => {
      const r = await generateApiKeyAction(labelInput);
      if (!r.ok) {
        toast.error("Couldn't generate key", { description: r.error });
        return;
      }
      // Insert the new key into the list immediately. The full key is
      // shown once via the reveal modal; the row itself only stores
      // the safe-to-display prefix.
      setKeys((prev) => [
        {
          id: r.id,
          prefix: r.prefix,
          label: labelInput.trim() || null,
          lastUsedAt: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setLabelInput("");
      setReveal({
        id: r.id,
        fullKey: r.fullKey,
        prefix: r.prefix,
        reason: "generated",
      });
    });
  };

  const doRegenerate = (id: string) => {
    startTransition(async () => {
      const r = await regenerateApiKeyAction(id);
      if (!r.ok) {
        toast.error("Couldn't regenerate", { description: r.error });
        return;
      }
      // Replace the row in place: same id slot, new prefix.
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id
            ? {
                id: r.id,
                prefix: r.prefix,
                label: k.label,
                lastUsedAt: null,
                createdAt: new Date().toISOString(),
              }
            : k,
        ),
      );
      setReveal({
        id: r.id,
        fullKey: r.fullKey,
        prefix: r.prefix,
        reason: "regenerated",
      });
    });
  };

  const doRevoke = (id: string) => {
    startTransition(async () => {
      const r = await revokeApiKeyAction(id);
      if (!r.ok) {
        toast.error("Couldn't revoke", { description: r.error });
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.info("Key revoked");
    });
  };

  return (
    <div className="fade-up" style={{ display: "grid", gap: 14, maxWidth: 760 }}>
      <div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          API Portal
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          Integrate ClipType&rsquo;s typing engine into your products. Keys are
          hashed at rest — we can&rsquo;t recover them, only revoke.
        </p>
      </div>

      {/* Generate */}
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          padding: 18,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13 }}>Create a new key</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Optional label (e.g. ‘Production server’)"
            maxLength={80}
            disabled={pending}
            style={{
              flex: 1,
              minWidth: 200,
              background: "var(--c-surface-b)",
              border: "1px solid var(--c-border)",
              borderRadius: 7,
              padding: "9px 12px",
              color: "var(--c-text)",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={onGenerate}
            disabled={pending}
            style={{
              padding: "9px 16px",
              borderRadius: 7,
              background: "var(--c-primary)",
              color: "#000",
              border: "none",
              fontWeight: 700,
              fontSize: 12,
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.6 : 1,
              fontFamily: "var(--font-sans)",
            }}
          >
            {pending ? "Generating…" : "Generate key"}
          </button>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--c-text-muted)",
            lineHeight: 1.55,
          }}
        >
          The full key is shown <strong>once</strong> after creation. Save it
          somewhere safe — you won&rsquo;t see it again.
        </div>
      </div>

      {/* Active keys */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
          Active keys
        </div>
        {keys.length === 0 ? (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>🔑</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              No keys yet
            </div>
            <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
              Generate one above to start integrating.
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {keys.map((k, i) => (
              <KeyRow
                key={k.id}
                k={k}
                isLast={i === keys.length - 1}
                onRegenerate={() =>
                  setConfirm({ kind: "regenerate", id: k.id, label: k.label })
                }
                onRevoke={() =>
                  setConfirm({ kind: "revoke", id: k.id, label: k.label })
                }
              />
            ))}
          </div>
        )}
      </div>

      <CodeExamples />

      {/* Confirm dialog (regenerate or revoke) */}
      <ConfirmDialog
        action={confirm}
        pending={pending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "regenerate") doRegenerate(confirm.id);
          else doRevoke(confirm.id);
          setConfirm(null);
        }}
      />

      {/* Show-once reveal */}
      <RevealDialog
        reveal={reveal}
        onClose={() => setReveal(null)}
      />
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function KeyRow({
  k,
  isLast,
  onRegenerate,
  onRevoke,
}: {
  k: ApiKeyRow;
  isLast: boolean;
  onRegenerate: () => void;
  onRevoke: () => void;
}) {
  const onCopyPrefix = async () => {
    try {
      await navigator.clipboard.writeText(k.prefix);
      toast.success("Prefix copied", {
        description: "Note: only the prefix — the full key is only shown at creation.",
      });
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div
      style={{
        padding: "13px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--c-border)",
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
      >
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--c-text)",
            background: "var(--c-surface-b)",
            padding: "4px 8px",
            borderRadius: 5,
            border: "1px solid var(--c-border)",
          }}
        >
          {k.prefix}…
        </code>
        {k.label && (
          <span style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
            {k.label}
          </span>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: "var(--c-text-muted)",
          }}
        >
          {k.lastUsedAt ? `Last used ${formatDate(k.lastUsedAt)}` : "Never used"}{" "}
          · Created {formatDate(k.createdAt)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button type="button" onClick={onCopyPrefix} style={ghostBtn(false)}>
          Copy prefix
        </button>
        <button type="button" onClick={onRegenerate} style={ghostBtn(false)}>
          Regenerate
        </button>
        <button type="button" onClick={onRevoke} style={dangerBtn(false)}>
          Revoke
        </button>
      </div>
    </div>
  );
}

// ─── Confirm dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({
  action,
  pending,
  onCancel,
  onConfirm,
}: {
  action: ConfirmAction;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = action !== null;
  if (!action) {
    return (
      <Dialog.Root open={false}>
        <Dialog.Portal />
      </Dialog.Root>
    );
  }
  const isRegen = action.kind === "regenerate";
  const title = isRegen ? "Regenerate this key?" : "Revoke this key?";
  const desc = isRegen
    ? "The current key stops working immediately. You'll see the new key once — save it before you close the dialog."
    : "Any service using this key will start receiving 401s right away. This can't be undone.";
  const cta = isRegen ? "Regenerate" : "Yes, revoke";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onCancel())}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 6000,
            background: "rgba(0,0,0,.85)",
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
            zIndex: 6001,
            width: "calc(100% - 40px)",
            maxWidth: 420,
            background: "var(--c-surface)",
            border: `1px solid color-mix(in srgb, var(--c-danger) 44%, transparent)`,
            borderRadius: 12,
            padding: 22,
            color: "var(--c-text)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <Dialog.Title
            style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}
          >
            {title}
          </Dialog.Title>
          <Dialog.Description
            style={{
              fontSize: 13,
              color: "var(--c-text-dim)",
              lineHeight: 1.55,
              marginBottom: 18,
            }}
          >
            {desc}
          </Dialog.Description>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              style={ghostBtn(pending)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              style={dangerBtn(pending)}
            >
              {pending ? "Working…" : cta}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Reveal dialog ───────────────────────────────────────────────────────────

function RevealDialog({
  reveal,
  onClose,
}: {
  reveal: RevealedKey | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!reveal) {
    return (
      <Dialog.Root open={false}>
        <Dialog.Portal />
      </Dialog.Root>
    );
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(reveal.fullKey);
      setCopied(true);
      toast.success("Key copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy", {
        description: "Long-press the field to copy manually.",
      });
    }
  };

  return (
    <Dialog.Root open onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 6000,
            background: "rgba(0,0,0,.85)",
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
            zIndex: 6001,
            width: "calc(100% - 40px)",
            maxWidth: 480,
            background: "var(--c-surface)",
            border: `1px solid color-mix(in srgb, var(--c-success) 44%, transparent)`,
            borderRadius: 12,
            padding: 22,
            color: "var(--c-text)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <Dialog.Title
            style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}
          >
            {reveal.reason === "generated"
              ? "Your new API key"
              : "Your regenerated key"}
          </Dialog.Title>
          <Dialog.Description
            style={{
              fontSize: 12,
              color: "var(--c-text-dim)",
              lineHeight: 1.55,
              marginBottom: 14,
            }}
          >
            Copy this now — once you close this dialog, the full key is gone
            for good. We only store the hash.
          </Dialog.Description>

          <div
            style={{
              background: "var(--c-surface-b)",
              border: "1px solid var(--c-border)",
              borderRadius: 8,
              padding: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              wordBreak: "break-all",
              marginBottom: 12,
              color: "var(--c-text)",
            }}
          >
            {reveal.fullKey}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onCopy}
              style={{
                padding: "8px 14px",
                borderRadius: 7,
                background: copied ? "var(--c-success)" : "var(--c-primary)",
                color: "#000",
                border: "none",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              {copied ? "✓ Copied" : "Copy key"}
            </button>
            <button type="button" onClick={onClose} style={ghostBtn(false)}>
              Done
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Code examples ───────────────────────────────────────────────────────────

function CodeExamples() {
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
        Quick start
      </div>
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <CodeBlock
          label="curl"
          code={`curl https://cliptypepro.com/api/v1/type \\
  -H "Authorization: Bearer ctp_live_sk_…" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Hello, world","speed":"human"}'`}
        />
        <CodeBlock
          label="JavaScript (fetch)"
          last
          code={`const res = await fetch("https://cliptypepro.com/api/v1/type", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.CLIPTYPE_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ text: "Hello, world", speed: "human" }),
});
const data = await res.json();`}
        />
      </div>
    </div>
  );
}

function CodeBlock({
  label,
  code,
  last,
}: {
  label: string;
  code: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        borderBottom: last ? "none" : "1px solid var(--c-border)",
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "var(--c-text-muted)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          background: "var(--c-surface-b)",
          border: "1px solid var(--c-border)",
          borderRadius: 7,
          padding: 12,
          color: "var(--c-text)",
          overflowX: "auto",
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        {code}
      </pre>
    </div>
  );
}

// ─── Reusable button styles ──────────────────────────────────────────────────

function ghostBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "7px 12px",
    borderRadius: 7,
    background: "var(--c-surface-b)",
    color: "var(--c-text)",
    border: "1px solid var(--c-border)",
    fontWeight: 600,
    fontSize: 11,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "var(--font-sans)",
  };
}

function dangerBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "7px 12px",
    borderRadius: 7,
    background: "color-mix(in srgb, var(--c-danger) 18%, transparent)",
    color: "var(--c-danger)",
    border: "1px solid color-mix(in srgb, var(--c-danger) 40%, transparent)",
    fontWeight: 600,
    fontSize: 11,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "var(--font-sans)",
  };
}
