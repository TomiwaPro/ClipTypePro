import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "System Status — ClipType Pro",
  description: "Live operational status of ClipType Pro services.",
};

const SERVICES = [
  { n: "Typing Engine", u: "99.98%" },
  { n: "API", u: "99.95%" },
  { n: "Snippet Sync", u: "99.91%" },
  { n: "Auth Service", u: "99.99%" },
  { n: "Platform Risk DB", u: "100%" },
  { n: "Billing", u: "99.97%" },
  { n: "File Export", u: "98.2%", deg: true },
];

const INCIDENTS = [
  { d: "Apr 15", t: "Snippet sync delay", dur: "14 min" },
  { d: "Apr 2", t: "API latency spike", dur: "6 min" },
  { d: "Mar 18", t: "Platform DB update delay", dur: "22 min" },
];

const pillStyle = (color: string) =>
  ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.8,
    background: `color-mix(in srgb, ${color} 18%, transparent)`,
    color,
    border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
  }) as const;

export default function StatusPage() {
  const anyDegraded = SERVICES.some((s) => s.deg);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "40px 20px" }}>
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

        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          System Status
        </h1>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 28 }}>
          <div
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              background: anyDegraded ? "var(--c-warning)" : "var(--c-success)",
              animation: "pulse 2s infinite",
            }}
          />
          <span
            style={{
              fontSize: 13,
              color: anyDegraded ? "var(--c-warning)" : "var(--c-success)",
              fontWeight: 600,
            }}
          >
            {anyDegraded ? "Partial degradation — File Export" : "All systems operational"}
          </span>
        </div>

        <div style={{ display: "grid", gap: 7, marginBottom: 28 }}>
          {SERVICES.map((s) => (
            <div
              key={s.n}
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: s.deg ? "var(--c-warning)" : "var(--c-success)",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, fontSize: 13 }}>{s.n}</span>
              <span style={pillStyle(s.deg ? "var(--c-warning)" : "var(--c-success)")}>
                {s.deg ? "degraded" : "operational"}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--c-text-muted)",
                  minWidth: 50,
                  textAlign: "right",
                }}
              >
                {s.u}
              </span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
          Recent Incidents
        </h2>
        {INCIDENTS.map((inc, i) => (
          <div
            key={i}
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{inc.t}</div>
              <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                {inc.d} 2026 · {inc.dur}
              </div>
            </div>
            <span style={pillStyle("var(--c-success)")}>resolved</span>
          </div>
        ))}
      </div>
    </main>
  );
}
