import Link from "next/link";
import type { LegalSection } from "@/lib/landing/legal-content";

/**
 * Reusable legal-page layout used by /privacy and /tos.
 * Server component — no interactivity needed.
 */
export function LegalPage({
  title,
  lastUpdated,
  sections,
}: {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 20px" }}>
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
          }}
        >
          ClipType Pro · {lastUpdated}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 13, color: "var(--c-text-dim)", marginBottom: 36 }}>
          Last updated: {lastUpdated}
        </p>

        {sections.map((s, i) => (
          <div key={s.title} style={{ marginBottom: 32 }}>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 15,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              {i + 1}. {s.title}
            </h2>
            <div
              style={{
                fontSize: 13,
                color: "var(--c-text-dim)",
                lineHeight: 1.85,
              }}
            >
              {s.body}
            </div>
          </div>
        ))}

        <div
          style={{
            padding: 20,
            background: "var(--c-surface-b)",
            borderRadius: 10,
            border: "1px solid var(--c-border)",
            marginTop: 40,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--c-text-dim)" }}>
            Questions?{" "}
            <a href="mailto:legal@cliptypepro.com" style={{ color: "var(--c-primary)" }}>
              legal@cliptypepro.com
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
