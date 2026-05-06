"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NAV_ITEMS } from "@/lib/dashboard/nav-items";
import { useUIStore } from "./ui-store";

/**
 * Global ⌘K palette.
 *
 * Indexes every nav item by label + slug + a few descriptions. Up/Down to
 * highlight, Enter to navigate, Esc to close. Pro-locked items still show
 * — clicking them opens the upgrade modal instead of navigating, matching
 * the sidebar behaviour.
 *
 * The hotkey listener is mounted once from the dashboard layout. Free
 * users still get the palette open behaviour (it's not a Pro feature).
 */
const SEARCH_INDEX = NAV_ITEMS.map((n) => ({
  slug: n.slug,
  label: n.label,
  pro: n.pro === true,
  // Hand-rolled descriptions improve fuzzy match a bit.
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
  icon: n.icon,
}));

export function GlobalSearch({
  isFree,
}: {
  isFree: boolean;
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SEARCH_INDEX;
    return SEARCH_INDEX.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.slug.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q),
    );
  }, [query]);

  const navigateTo = (slug: string, isPro: boolean) => {
    close();
    if (isPro && isFree) {
      openUpgrade(slug);
      return;
    }
    router.push(`/dashboard/${slug}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[highlight];
      if (item) navigateTo(item.slug, item.pro);
    }
  };

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
            {results.length === 0 && (
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
            {results.map((item, i) => {
              const isHighlighted = i === highlight;
              const showLock = item.pro && isFree;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => navigateTo(item.slug, item.pro)}
                  onMouseEnter={() => setHighlight(i)}
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
                    {item.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        marginBottom: 2,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--c-text-dim)",
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                  {showLock && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: 0.6,
                        color: "var(--c-text-muted)",
                        background: "var(--c-surface-b)",
                        border: "1px solid var(--c-border)",
                        borderRadius: 3,
                        padding: "2px 6px",
                      }}
                    >
                      PRO
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>↵</span>
                </button>
              );
            })}
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
