"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "ctp_cookie_consent";
type Choice = "all" | "essential";

/**
 * GDPR cookie banner.
 *
 * Reads consent from localStorage via `useSyncExternalStore`, which is
 * hydration-safe (server renders the "no choice yet" branch consistently;
 * the client hydrates and immediately reflects the saved choice without
 * triggering a setState-in-effect lint warning).
 *
 * Visible only on the landing page — mounted from `src/app/page.tsx`.
 */

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getSnapshot(): Choice | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "all" || v === "essential" ? v : null;
  } catch {
    // localStorage blocked → treat as "no choice" so the banner shows.
    return null;
  }
}

function getServerSnapshot(): Choice | null {
  // SSR: render the banner-visible branch. The client-side hydrate will
  // immediately re-read localStorage and either keep showing or hide.
  return null;
}

export function CookieBanner() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const decide = (next: Choice) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
      // Notify same-tab subscribers (the storage event only fires for OTHER tabs).
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {
      /* noop */
    }
  };

  if (choice !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 8000,
        background: "var(--c-surface)",
        borderTop: "1px solid var(--c-border)",
        padding: "14px 24px",
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap",
        animation: "slideUp .3s ease",
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>🍪 Cookie Consent</span>
        <span
          style={{
            fontSize: 12,
            color: "var(--c-text-dim)",
            marginLeft: 8,
          }}
        >
          We use essential cookies only. No tracking, no ads, no third-party analytics.
        </span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => decide("essential")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--c-border)",
            background: "var(--c-surface-b)",
            color: "var(--c-text-dim)",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Essential only
        </button>
        <button
          type="button"
          onClick={() => decide("all")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "var(--c-primary)",
            color: "#000",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
