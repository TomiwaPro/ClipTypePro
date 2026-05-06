"use client";

import { Pencil, Play, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { incrementSnippetUseAction } from "@/app/dashboard/snippets/actions";
import { setPendingSnippet } from "@/lib/typer/pending-snippet";
import {
  ConfirmDeleteDialog,
} from "./confirm-delete-dialog";
import {
  type EditingSnippet,
  SnippetFormModal,
} from "./snippet-form-modal";

/**
 * Snippet library — full CRUD + search + filter + export + load-and-type.
 *
 * Receives the initial list from the server layout (server-rendered, so
 * users see content immediately on first load, no skeleton flash). All
 * mutations call server actions which `revalidatePath` the segment so
 * the next render reflects the new state. We therefore don't keep a
 * client-side cache to invalidate manually.
 */

export type Snippet = {
  id: string;
  title: string;
  category: string;
  content: string;
  use_count: number;
  created_at: string;
};

const ALL_CATEGORIES = "All";
const KNOWN_CATEGORIES = [
  "Support",
  "Email",
  "Dev",
  "Healthcare",
  "Legal",
  "Sales",
  "General",
];

export function SnippetsClient({ snippets }: { snippets: Snippet[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EditingSnippet | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(
    null,
  );

  // Categories present in the user's snippets, plus the canonical list,
  // de-duped, with "All" pinned to the front.
  const categories = useMemo(() => {
    const present = new Set<string>(KNOWN_CATEGORIES);
    snippets.forEach((s) => present.add(s.category));
    return [ALL_CATEGORIES, ...Array.from(present)];
  }, [snippets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snippets.filter((s) => {
      if (activeCategory !== ALL_CATEGORIES && s.category !== activeCategory) {
        return false;
      }
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q)
      );
    });
  }, [snippets, activeCategory, query]);

  const onLoadAndType = (s: Snippet) => {
    // Set pending content first so the typer reads it on mount even if the
    // server-action increment hasn't finished yet (it doesn't gate UX).
    setPendingSnippet(s.content);
    startTransition(async () => {
      void incrementSnippetUseAction(s.id);
      router.push("/dashboard/typer");
    });
  };

  const onExport = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      count: snippets.length,
      snippets: snippets.map((s) => ({
        title: s.title,
        category: s.category,
        content: s.content,
        use_count: s.use_count,
        created_at: s.created_at,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cliptypepro-snippets.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Snippets exported", {
      description: `${snippets.length} snippet${snippets.length === 1 ? "" : "s"}`,
    });
  };

  // ─── Empty state (no snippets at all) ────────────────────────────────
  if (snippets.length === 0) {
    return (
      <>
        <div className="fade-up">
          <PageHeader
            count={0}
            onCreate={() => setCreateOpen(true)}
            onExport={onExport}
            exportEnabled={false}
          />
          <EmptyState onCreate={() => setCreateOpen(true)} />
        </div>
        <SnippetFormModal
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </>
    );
  }

  return (
    <>
      <div className="fade-up">
        <PageHeader
          count={snippets.length}
          onCreate={() => setCreateOpen(true)}
          onExport={onExport}
          exportEnabled
        />

        {/* Search */}
        <div style={{ marginBottom: 12 }}>
          <input
            type="search"
            placeholder="Search by title or content…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 380,
              background: "var(--c-surface-b)",
              border: "1px solid var(--c-border)",
              borderRadius: 7,
              padding: "8px 10px",
              color: "var(--c-text)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>

        {/* Category filter chips */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {categories.map((c) => {
            const active = activeCategory === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                style={{
                  padding: "5px 11px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  border: `1px solid ${active ? "var(--c-primary)" : "var(--c-border)"}`,
                  background: active
                    ? "color-mix(in srgb, var(--c-primary) 15%, transparent)"
                    : "transparent",
                  color: active ? "var(--c-primary)" : "var(--c-text-dim)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* List or "no results" */}
        {filtered.length === 0 ? (
          <NoResults query={query} category={activeCategory} />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {filtered.map((s) => (
              <SnippetCard
                key={s.id}
                snippet={s}
                onEdit={() =>
                  setEditing({
                    id: s.id,
                    title: s.title,
                    category: s.category,
                    content: s.content,
                  })
                }
                onDelete={() => setDeleting({ id: s.id, title: s.title })}
                onLoadAndType={() => onLoadAndType(s)}
                pending={pending}
              />
            ))}
          </div>
        )}
      </div>

      {/*
        `key` forces a remount whenever we switch between create-mode and
        edit-mode (or between two different snippets). This re-runs
        useForm with fresh defaultValues — cleaner than a derived-state
        useEffect, and keeps the React 19 hook compiler happy.
      */}
      <SnippetFormModal
        key={editing?.id ?? (createOpen ? "create" : "closed")}
        open={createOpen || editing !== null}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setEditing(null);
          }
        }}
        snippet={editing ?? undefined}
      />

      <ConfirmDeleteDialog
        open={deleting !== null}
        snippetId={deleting?.id ?? null}
        snippetTitle={deleting?.title ?? null}
        onOpenChange={(o) => !o && setDeleting(null)}
        onDeleted={() => {
          /* parent re-renders via revalidatePath in the server action */
        }}
      />
    </>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────
function PageHeader({
  count,
  onCreate,
  onExport,
  exportEnabled,
}: {
  count: number;
  onCreate: () => void;
  onExport: () => void;
  exportEnabled: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Snippet Library
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          {count === 0
            ? "No snippets yet"
            : `${count} snippet${count === 1 ? "" : "s"}`}
        </p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onExport}
          disabled={!exportEnabled}
          style={{
            padding: "7px 13px",
            borderRadius: 7,
            border: "1px solid var(--c-border)",
            background: "var(--c-surface-b)",
            color: "var(--c-text-dim)",
            fontSize: 11,
            fontWeight: 600,
            cursor: exportEnabled ? "pointer" : "not-allowed",
            opacity: exportEnabled ? 1 : 0.5,
            fontFamily: "var(--font-sans)",
          }}
        >
          ↓ Export JSON
        </button>
        <button
          type="button"
          onClick={onCreate}
          style={{
            padding: "7px 13px",
            borderRadius: 7,
            border: "none",
            background: "var(--c-primary)",
            color: "#000",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-sans)",
          }}
        >
          <Plus size={12} />
          New snippet
        </button>
      </div>
    </div>
  );
}

// ─── Single snippet card ────────────────────────────────────────────────────
function SnippetCard({
  snippet,
  onEdit,
  onDelete,
  onLoadAndType,
  pending,
}: {
  snippet: Snippet;
  onEdit: () => void;
  onDelete: () => void;
  onLoadAndType: () => void;
  pending: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
      className="hover-card"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 4,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={snippet.title}
          >
            {snippet.title}
          </div>
          <span
            style={{
              display: "inline-flex",
              padding: "2px 7px",
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.6,
              background:
                "color-mix(in srgb, var(--c-accent) 18%, transparent)",
              color: "var(--c-accent)",
              border:
                "1px solid color-mix(in srgb, var(--c-accent) 30%, transparent)",
            }}
          >
            {snippet.category.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <IconBtn label="Edit snippet" onClick={onEdit}>
            <Pencil size={12} />
          </IconBtn>
          <IconBtn label="Delete snippet" onClick={onDelete} destructive>
            <Trash2 size={12} />
          </IconBtn>
        </div>
      </div>

      <p
        style={{
          fontSize: 11,
          color: "var(--c-text-dim)",
          lineHeight: 1.55,
          margin: 0,
          fontFamily: "var(--font-mono)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          minHeight: 51,
        }}
      >
        {snippet.content}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "auto",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onLoadAndType}
          disabled={pending}
          style={{
            padding: "6px 11px",
            borderRadius: 7,
            background: "var(--c-primary)",
            color: "#000",
            border: "none",
            fontSize: 11,
            fontWeight: 700,
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.7 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-sans)",
          }}
        >
          <Play size={11} fill="currentColor" />
          Load &amp; Type
        </button>
        <span
          style={{
            fontSize: 10,
            color: "var(--c-text-muted)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {snippet.use_count}× used
        </span>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        border: "1px solid var(--c-border)",
        background: destructive
          ? "color-mix(in srgb, var(--c-danger) 12%, transparent)"
          : "var(--c-surface-b)",
        color: destructive ? "var(--c-danger)" : "var(--c-text-dim)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

// ─── Empty + No-results states ──────────────────────────────────────────────
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "60px 20px",
        maxWidth: 360,
        margin: "0 auto",
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 14, opacity: 0.6 }}>◫</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
        No snippets yet
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--c-text-dim)",
          lineHeight: 1.65,
          marginBottom: 20,
        }}
      >
        Save reusable text — customer responses, code blocks, medical notes,
        legal boilerplate. Load with one click into the typer.
      </div>
      <button
        type="button"
        onClick={onCreate}
        style={{
          padding: "10px 18px",
          borderRadius: 8,
          border: "none",
          background: "var(--c-primary)",
          color: "#000",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--font-sans)",
        }}
      >
        <Plus size={13} />
        Create your first snippet
      </button>
    </div>
  );
}

function NoResults({
  query,
  category,
}: {
  query: string;
  category: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px 20px",
        color: "var(--c-text-dim)",
        fontSize: 13,
      }}
    >
      No snippets match{" "}
      {query ? (
        <>
          &ldquo;<strong style={{ color: "var(--c-text)" }}>{query}</strong>
          &rdquo;
        </>
      ) : (
        "your filters"
      )}
      {category !== ALL_CATEGORIES && (
        <>
          {" "}
          in{" "}
          <strong style={{ color: "var(--c-text)" }}>{category}</strong>
        </>
      )}
      .
    </div>
  );
}
