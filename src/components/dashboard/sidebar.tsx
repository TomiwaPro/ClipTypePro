"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { type MouseEvent } from "react";
import { NAV_ITEMS } from "@/lib/dashboard/nav-items";
import { useUIStore } from "./ui-store";

/**
 * Authenticated dashboard sidebar.
 *
 * Active route is derived from `usePathname()` so the highlight tracks
 * Next's client transitions without a re-render hack.
 *
 * Pro-locked items: free users get a tiny "PRO" badge in place of any
 * notification badge; click is intercepted to open the upgrade modal
 * instead of navigating, since we'd otherwise show them an empty teaser
 * page.
 *
 * Receives the unread notif count and current tier as props from the
 * server layout — no client-side data fetches.
 */
export function Sidebar({
  tier,
  unreadCount,
  trialDaysLeft,
}: {
  tier: "free" | "pro" | "teams" | "enterprise";
  unreadCount: number;
  /** Days remaining in Pro trial (negative if expired or no trial). */
  trialDaysLeft: number | null;
}) {
  const pathname = usePathname();
  const openSearch = useUIStore((s) => s.openSearch);
  const openUpgrade = useUIStore((s) => s.openUpgrade);
  const isFree = tier === "free";

  const handleNavClick = (
    e: MouseEvent<HTMLAnchorElement>,
    slug: string,
    isPro: boolean,
  ) => {
    if (isPro && isFree) {
      e.preventDefault();
      openUpgrade(slug);
    }
  };

  return (
    <aside
      style={{
        width: 200,
        minWidth: 200,
        background: "var(--c-surface)",
        borderRight: "1px solid var(--c-border)",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
      className="dashboard-sidebar"
    >
      {/* Brand + search trigger */}
      <div
        style={{
          padding: "16px 14px 12px",
          borderBottom: "1px solid var(--c-border)",
        }}
      >
        <Link
          href="/dashboard/typer"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 15,
            fontWeight: 700,
            display: "block",
            marginBottom: 10,
            textDecoration: "none",
          }}
        >
          <span style={{ color: "var(--c-primary)" }}>Clip</span>
          <span style={{ color: "var(--c-text)" }}>Type</span>
          <span style={{ color: "var(--c-accent)" }}>Pro</span>
        </Link>

        <button
          type="button"
          onClick={openSearch}
          style={{
            width: "100%",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 7,
            background: "var(--c-surface-b)",
            border: "1px solid var(--c-border)",
            color: "var(--c-text-muted)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          <Search size={12} />
          <span style={{ flex: 1, textAlign: "left" }}>Search…</span>
          <kbd
            style={{
              fontSize: 9,
              background: "var(--c-bg)",
              border: "1px solid var(--c-border)",
              borderRadius: 3,
              padding: "1px 5px",
              fontFamily: "var(--font-mono)",
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav items */}
      <nav
        style={{
          flex: 1,
          padding: "6px 0",
          overflowY: "auto",
        }}
      >
        {NAV_ITEMS.map((n) => {
          const href = `/dashboard/${n.slug}`;
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          const showLock = n.pro && isFree;
          const showBadge =
            n.slug === "notifications" && unreadCount > 0 && !showLock;

          return (
            <Link
              key={n.slug}
              href={href}
              onClick={(e) => handleNavClick(e, n.slug, n.pro === true)}
              className="dashboard-nav-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                color: active ? "var(--c-primary)" : "var(--c-text-dim)",
                background: active
                  ? "color-mix(in srgb, var(--c-primary) 10%, transparent)"
                  : "transparent",
                borderLeft: `2px solid ${active ? "var(--c-primary)" : "transparent"}`,
                textDecoration: "none",
                opacity: showLock ? 0.7 : 1,
                cursor: "pointer",
                transition: "all .12s",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  width: 14,
                  textAlign: "center",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {n.icon}
              </span>
              <span style={{ flex: 1, whiteSpace: "nowrap" }}>{n.label}</span>
              {showLock && (
                <span
                  style={{
                    fontSize: 8,
                    color: "var(--c-text-muted)",
                    background: "var(--c-surface-b)",
                    border: "1px solid var(--c-border)",
                    borderRadius: 3,
                    padding: "1px 4px",
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  PRO
                </span>
              )}
              {showBadge && (
                <span
                  aria-label={`${unreadCount} unread`}
                  style={{
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 8,
                    background: "var(--c-danger)",
                    color: "#fff",
                    fontSize: 9,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: tier indicator / upgrade prompt */}
      <div
        style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--c-border)",
        }}
      >
        {isFree ? (
          <button
            type="button"
            onClick={() => openUpgrade(null)}
            style={{
              display: "block",
              width: "100%",
              padding: 8,
              borderRadius: 8,
              background: "var(--c-primary)",
              color: "#000",
              fontSize: 11,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            ✦ Upgrade to Pro
          </button>
        ) : (
          <div
            style={{
              fontSize: 10,
              color: "var(--c-success)",
              textAlign: "center",
            }}
          >
            ✦{" "}
            {trialDaysLeft !== null && trialDaysLeft > 0
              ? `Pro Trial Active — ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"}`
              : `${tier.charAt(0).toUpperCase() + tier.slice(1)} active`}
          </div>
        )}
      </div>

      {/*
        Helper for the topbar: makes the sidebar a fixed-width column on
        desktop and hides it on mobile (the topbar reveals a toggle later).
      */}
      <style>{`
        @media (max-width: 720px) {
          .dashboard-sidebar { display: none; }
        }
        .dashboard-nav-item:hover {
          color: var(--c-primary) !important;
        }
      `}</style>
    </aside>
  );
}
