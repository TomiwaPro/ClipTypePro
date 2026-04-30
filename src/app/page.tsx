"use client";

import { useTheme } from "@/components/theme-provider";

const SWATCHES = [
  "primary",
  "accent",
  "success",
  "warning",
  "danger",
  "text",
  "text-dim",
  "text-muted",
] as const;

export default function Home() {
  const { theme, toggle } = useTheme();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div style={{ maxWidth: 560, width: "100%" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          <span style={{ color: "var(--c-primary)" }}>Clip</span>
          <span style={{ color: "var(--c-text)" }}>Type</span>
          <span style={{ color: "var(--c-accent)" }}>Pro</span>
        </div>

        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 12,
          }}
        >
          Foundation ready.
        </h1>

        <p
          style={{
            color: "var(--c-text-dim)",
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 24,
          }}
        >
          Step 1 scaffold complete: Next.js + Tailwind v4 + design tokens +
          DM&nbsp;Sans / Space&nbsp;Mono + dark/light theme provider. Toggle the
          theme below to verify all colors flip and contrast stays readable in
          both modes.
        </p>

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: "var(--c-text-dim)" }}>
              Current theme:{" "}
              <strong style={{ color: "var(--c-text)" }}>{theme}</strong>
            </span>
            <button
              onClick={toggle}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: "var(--c-primary)",
                color: theme === "dark" ? "#000" : "#fff",
                border: "none",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Toggle theme
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
            }}
          >
            {SWATCHES.map((t) => (
              <div
                key={t}
                style={{
                  background: "var(--c-surface-b)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 6,
                  padding: 8,
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 18,
                    borderRadius: 4,
                    background: `var(--c-${t})`,
                    marginBottom: 4,
                  }}
                />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
