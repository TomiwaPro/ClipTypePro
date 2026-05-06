"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_ITEMS } from "@/lib/dashboard/nav-items";
import { useUIStore } from "./ui-store";

/**
 * Global ⌘K palette.
 *
 * Indexes three categories of content (passed in by the dashboard layout
 * so we don't hit the DB on every keystroke):
 *
 *   1. Navigation — every dashboard route, with hand-curated descriptions.
 *      Pro-locked items still appear; Enter/click opens the upgrade
 *      modal instead of navigating.
 *
 *   2. Platforms — every row from `platform_ratings`. Picking one routes
 *      to /dashboard/platforms (no per-platform detail page yet).
 *
 *   3. Snippets — the user's snippets (limited to 50 most recent).
 *      Picks route to /dashboard/snippets. Empty for new users.
 *
 * Up/Down to highlight across the flat result list, Enter to act, Esc
 * to close. Pro-lock semantics match the sidebar.
 */

type PlatformRow = {
  name: string;
  category: string;
  riskLevel: "green" | "yellow" | "red";
};

type SnippetRow = {
  id: string;
  title: string;
  category: string;
};

type SearchResult =
  | {
      kind: "nav";
      label: string;
      slug: string;
      icon: string;
      description: string;
      pro: boolean;
    }
  | {
      kind: "platform";
      label: string;
      category: string;
      riskLevel: "green" | "yellow" | "red";
    }
  | {
      kind: "snippet";
      label: string;
      category: string;
    };

const NAV_INDEX = NAV_ITEMS.map((n) => ({
  slug: n.slug,
  label: n.label,
  pro: n.pro === true,
  icon: n.icon,
  description:
    {
      typer: "Start typing from clipboard",
      snippets: "Manage snippet library",
      platforms: "Platform risk levels",
      analytics: "Typing performance",
      team: "Manage team members",
      compliance: "HIPAA / GDPR controls",
      marketplace: "Browse snippet packs",
      referrals: "Earn free Pro months",
      billing: "Manage subscription",
      api: "API keys & docs",
      notifications: "View notifications",
      help: "Guides and FAQs",
      settings: "Account & preferences",
    }[n.slug] ?? "",
}));

export function GlobalSearch({
  isFree,
  platforms,
  snippets,
}: {
  isFree: boolean;
  platforms: PlatformRow[];
  snippets: SnippetRow[];
}) {
  const open = useUIStore((s) => s.searchOpen);
  const close = useUIStore((s) => s.closeSearch);
  const toggle = useUIStore((s) => s.toggleSearch);
  const openUpgrade = useUIStore((s) => s.openUpgrade);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K hotkey — wired here so it works even before the user has
  // ever clicked the search trigger button.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  // Reset query + selection on each open. Done via Dialog.Root.onOpenChange
  // (a callback, not a useEffect) so the React 19 hook compiler doesn't
  // flag setState-in-effect — the change is event-driven, not derived.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setQuery("");
      setHighlight(0);
      // Defer focus to next tick — Radix portal mounts async.
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      close();
    }
  };

  // Build flat result list with section breaks. We compute group offsets
  // so Up/Down keyboard nav can skip headers correctly.
  const { groups, flat } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchNav = NAV_INDEX.filter(
      (i) =>
        !q ||
        i.label.toLowerCase().includes(q) ||
        i.slug.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    );
    const matchPlatforms = q
      ? platforms.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q),
        )
      : platforms.slice(0, 5);
    const matchSnippets = q
      ? snippets.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q),
        )
      : snippets.slice(0, 5);

    const navResults: SearchResult[] = matchNav.map((n) => ({
      kind: "nav",
      label: n.label,
      slug: n.slug,
      icon: n.icon,
      description: n.description,
      pro: n.pro,
    }));
    const platformResults: SearchResult[] = matchPlatforms.map((p) => ({
      kind: "platform",
      label: p.name,
      category: p.category,
      riskLevel: p.riskLevel,
    }));
    const snippetResults: SearchResult[] = matchSnippets.map((s) => ({
      kind: "snippet",
      label: s.title,
      category: s.category,
    }));

    const groups = [
      navResults.length > 0 && { title: "Navigation", items: navResults },
      platformResults.length > 0 && { title: "Platforms", items: platformResults },
      snippetResults.length > 0 && { title: "Snippets", items: snippetResults },
    ].filter(Boolean) as { title: string; items: SearchResult[] }[];

    const flat = groups.flatMap((g) => g.items);
    return { groups, flat };
  }, [query, platforms, snippets]);

  const navigateTo = (item: SearchResult) => {
    close();
    if (item.kind === "nav") {
      if (item.pro && isFree) {
        openUpgrade(item.slug);
        return;
      }
      router.push(`/dashboard/${item.slug}`);
      return;
    }
    if (item.kind === "platform") {
      router.push("/dashboard/platforms");
      return;
    }
    if (item.kind === "snippet") {
      router.push("/dashboard/snippets");
      return;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(flat.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[highlight];
      if (item) navigateTo(item);
    }
  };

  // Track flat index per item so highlight matches keyboard position.
  let runningIndex = -1;

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9000,
            background: "rgba(0,0,0,.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        />
        <Dialog.Content
          aria-label="Global search"
          style={{
            position: "fixed",
            top: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9001,
            width: "calc(100% - 40px)",
            maxWidth: 500,
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,.6)",
            color: "var(--c-text)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <Dialog.Title style={{ position: "absolute", left: -9999 }}>
            Search ClipType Pro
          </Dialog.Title>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 16px",
              borderBottom: "1px solid var(--c-border)",
            }}
          >
            <span style={{ fontSize: 16, color: "var(--c-text-muted)" }}>⌕</span>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search anywhere…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 14,
                color: "var(--c-text)",
                fontFamily: "var(--font-sans)",
              }}
            />
            <kbd
              style={{
                fontSize: 10,
                color: "var(--c-text-muted)",
                background: "var(--c-surface-b)",
                border: "1px solid var(--c-border)",
                borderRadius: 4,
                padding: "2px 6px",
              }}
            >
              ESC
            </kbd>
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {flat.length === 0 && (
              <div
                style={{
                  padding: 24,
                  textAlign: "center",
                  color: "var(--c-text-muted)",
                  fontSize: 13,
                }}
              >
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {groups.map((g) => (
              <div key={g.title}>
                <div
                  style={{
                    padding: "8px 16px 4px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: "var(--c-text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {g.title}
                </div>
                {g.items.map((item) => {
                  runningIndex++;
                  const i = runningIndex;
                  const isHighlighted = i === highlight;
                  return (
                    <ResultRow
                      key={`${item.kind}-${item.label}`}
                      item={item}
                      isHighlighted={isHighlighted}
                      isFree={isFree}
                      onClick={() => navigateTo(item)}
                      onMouseEnter={() => setHighlight(i)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div
            style={{
              padding: "8px 16px",
              borderTop: "1px solid var(--c-border)",
              display: "flex",
              gap: 14,
            }}
          >
            {[
              ["↵", "Select"],
              ["↑↓", "Navigate"],
              ["ESC", "Close"],
              ["⌘K", "Open"],
            ].map(([k, l]) => (
              <span
                key={k}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: 10,
                  color: "var(--c-text-muted)",
                }}
              >
                <kbd
                  style={{
                    background: "var(--c-surface-b)",
                    border: "1px solid var(--c-border)",
                    borderRadius: 3,
                    padding: "1px 5px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {k}
                </kbd>
                {l}
              </span>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ResultRow({
  item,
  isHighlighted,
  isFree,
  onClick,
  onMouseEnter,
}: {
  item: SearchResult;
  isHighlighted: boolean;
  isFree: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  // Per-kind visual treatment.
  let icon: string;
  let secondary: string;
  let badge: { color: string; label: string } | null = null;

  if (item.kind === "nav") {
    icon = item.icon;
    secondary = item.description;
    if (item.pro && isFree) {
      badge = { color: "var(--c-text-muted)", label: "PRO" };
    }
  } else if (item.kind === "platform") {
    icon = item.riskLevel === "green" ? "✓" : item.riskLevel === "yellow" ? "⚠" : "✕";
    secondary = item.category;
    badge = {
      color:
        item.riskLevel === "green"
          ? "var(--c-success)"
          : item.riskLevel === "yellow"
            ? "var(--c-warning)"
            : "var(--c-danger)",
      label:
        item.riskLevel === "green" ? "SAFE" : item.riskLevel === "yellow" ? "CAUTION" : "RISK",
    };
  } else {
    icon = "◫";
    secondary = item.category;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        width: "100%",
        padding: "11px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: isHighlighted
          ? "color-mix(in srgb, var(--c-primary) 8%, transparent)"
          : "transparent",
        border: "none",
        borderBottom: "1px solid var(--c-border)",
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
        color: "var(--c-text)",
        textAlign: "left",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "color-mix(in srgb, var(--c-primary) 15%, transparent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            marginBottom: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--c-text-dim)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {secondary}
        </div>
      </div>
      {badge && (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.6,
            color: badge.color,
            background: "var(--c-surface-b)",
            border: `1px solid color-mix(in srgb, ${badge.color} 30%, transparent)`,
            borderRadius: 3,
            padding: "2px 6px",
          }}
        >
          {badge.label}
        </span>
      )}
      <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>↵</span>
    </button>
  );
}
