import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — ClipType Pro",
  description: "Built by people who hate typing the same thing twice.",
};

const STATS = [
  ["2025", "Founded"],
  ["12,400+", "Active users"],
  ["50,000h", "Saved monthly"],
  ["25+", "Platform ratings"],
] as const;

const PRINCIPLES = [
  ["Privacy by design", "Your clipboard data never leaves your device. Ever."],
  [
    "Transparency first",
    "Platform risk ratings published openly — no hidden limitations.",
  ],
  [
    "Accessibility always",
    "Built for users with motor disabilities, not just power users.",
  ],
  [
    "Honest pricing",
    "No dark patterns. Cancel anytime. 14-day guarantee. No questions asked.",
  ],
] as const;

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "6px 13px",
            borderRadius: 8,
            background: "var(--c-surface-b)",
            color: "var(--c-text-dim)",
            fontSize: 11,
            fontWeight: 600,
            textDecoration: "none",
            marginBottom: 24,
          }}
        >
          ← Back
        </Link>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--c-primary)",
            marginBottom: 8,
            letterSpacing: 1,
          }}
        >
          ABOUT US
        </div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 26,
            fontWeight: 700,
            marginBottom: 20,
            lineHeight: 1.2,
          }}
        >
          Built by people who hate typing the same thing twice.
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "var(--c-text-dim)",
            lineHeight: 1.85,
            marginBottom: 20,
          }}
        >
          ClipType Pro was born in 2025 out of a single frustration: paste is
          blocked everywhere that matters — hospital systems, banking portals,
          customer support tools. That&apos;s broken. We fixed it.
        </p>
        <p
          style={{
            fontSize: 14,
            color: "var(--c-text-dim)",
            lineHeight: 1.85,
            marginBottom: 32,
          }}
        >
          Today, ClipType Pro serves over 12,000 users across healthcare, legal,
          customer support, software development and content creation — saving
          an estimated 50,000 hours of typing every month.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 28,
          }}
        >
          {STATS.map(([v, l]) => (
            <div
              key={l}
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
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--c-primary)",
                  marginBottom: 3,
                }}
              >
                {v}
              </div>
              <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>{l}</div>
            </div>
          ))}
        </div>

        {PRINCIPLES.map(([t, d]) => (
          <div
            key={t}
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                color: "var(--c-primary)",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ✦
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{t}</div>
              <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>{d}</div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
