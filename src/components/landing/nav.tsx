"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
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
        padding: "0 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
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
        {NAV_LINKS.map((l) => (
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
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Link
          href="/login"
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
          }}
        >
          Start free trial →
        </Link>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .landing-nav-links { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
