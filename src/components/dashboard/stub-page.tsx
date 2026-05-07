"use client";

import { useUIStore } from "./ui-store";

/**
 * Reusable placeholder for Pro-locked pages a free user can't access yet.
 * Renders a heading, subtitle, the "🔒 Pro feature → Upgrade" prompt,
 * and a "what you'll get" panel.
 */
export function StubPage({
  title,
  subtitle,
  comingIn,
  bullets,
  proLocked = false,
  isFree = false,
}: {
  title: string;
  subtitle: string;
  comingIn: string;
  bullets: string[];
  proLocked?: boolean;
  isFree?: boolean;
}) {
  const openUpgrade = useUIStore((s) => s.openUpgrade);

  return (
    <div className="fade-up" style={{ maxWidth: 640 }}>
      <h1
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 19,
          fontWeight: 700,
          marginBottom: 4,
        }}
      >
        {title}
      </h1>
      <p
        style={{ color: "var(--c-text-dim)", fontSize: 13, marginBottom: 20 }}
      >
        {subtitle}
      </p>

      {proLocked && isFree && (
        <div
          style={{
            background: "color-mix(in srgb, var(--c-primary) 8%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--c-primary) 30%, transparent)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 16,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 22 }}>🔒</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Pro feature</div>
            <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
              Upgrade to unlock {title.toLowerCase()}.
            </div>
          </div>
          <button
            type="button"
            onClick={() => openUpgrade(title.toLowerCase())}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              background: "var(--c-primary)",
              color: "#000",
              fontWeight: 600,
              fontSize: 12,
              border: "none",
              cursor: "pointer",
            }}
          >
            ✦ Upgrade
          </button>
        </div>
      )}

      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--c-primary)",
            fontWeight: 700,
            marginBottom: 10,
            letterSpacing: 1,
          }}
        >
          COMING IN {comingIn.toUpperCase()}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {bullets.map((b) => (
            <div
              key={b}
              style={{
                display: "flex",
                gap: 8,
                fontSize: 12,
                color: "var(--c-text-dim)",
              }}
            >
              <span style={{ color: "var(--c-primary)", flexShrink: 0 }}>✦</span>
              {b}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
