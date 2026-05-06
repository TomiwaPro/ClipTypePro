"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { useTheme } from "@/components/theme-provider";
import { NAV_LINKS } from "@/lib/landing/content";

/**
 * Sticky landing nav.
 *
 *   - Below 8px of scroll: subtle blur, low-opacity bg (lets the hero glow show through)
 *   - 8px+ scroll: stronger blur + opaque bg + bottom border (clear separation from content)
 *
 * Reads window.scrollY via useSyncExternalStore so React Compiler stays happy.
 */
function subscribe(cb: () => void) {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
function snapshot() {
  return window.scrollY > 8;
}
function serverSnapshot() {
  return false;
}

export function Nav() {
  const scrolled = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  // Smooth scroll for anchor jumps — apply once, idempotent.
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: scrolled
          ? "color-mix(in srgb, var(--c-bg) 88%, transparent)"
          : "color-mix(in srgb, var(--c-bg) 60%, transparent)",
        backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "blur(8px)",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(180%)" : "blur(8px)",
        borderBottom: scrolled ? "1px solid var(--c-border)" : "1px solid transparent",
        // Tighten padding at small widths so logo + buttons + theme toggle don't overflow at 320–375px.
        padding: "0 clamp(14px, 4vw, 40px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        height: 60,
        transition: "background .2s, border-color .2s, backdrop-filter .2s",
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 16,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        <span style={{ color: "var(--c-primary)" }}>Clip</span>
        <span style={{ color: "var(--c-text)" }}>Type</span>
        <span style={{ color: "var(--c-accent)" }}>Pro</span>
      </Link>

      <div
        style={{
          display: "flex",
          gap: 28,
          alignItems: "center",
        }}
        className="landing-nav-links"
      >
        {NAV_LINKS.map((l) =>
          l.disabled ? (
            <span
              key={l.label}
              aria-disabled="true"
              title="Coming soon"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "var(--c-text-muted)",
                cursor: "not-allowed",
                textDecoration: "none",
              }}
            >
              {l.label}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  background: "color-mix(in srgb, var(--c-warning) 15%, transparent)",
                  color: "var(--c-warning)",
                  border: "1px solid color-mix(in srgb, var(--c-warning) 30%, transparent)",
                }}
              >
                SOON
              </span>
            </span>
          ) : (
            <a
              key={l.label}
              href={l.href}
              className="nav-link"
              style={{
                fontSize: 13,
                color: "var(--c-text-dim)",
                cursor: "pointer",
                transition: "color .15s",
                textDecoration: "none",
              }}
            >
              {l.label}
            </a>
          ),
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={toggle}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: "var(--c-surface-b)",
            border: "1px solid var(--c-border)",
            color: "var(--c-text-dim)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <Link
          href="/login"
          className="landing-signin-link"
          style={{
            padding: "6px 13px",
            borderRadius: 8,
            background: "var(--c-surface-b)",
            color: "var(--c-text-dim)",
            fontSize: 11,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          style={{
            padding: "6px 13px",
            borderRadius: 8,
            background: "var(--c-primary)",
            color: "#000",
            fontSize: 11,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          Start free trial →
        </Link>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .landing-nav-links { display: none !important; }
        }
        @media (max-width: 380px) {
          .landing-signin-link { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
