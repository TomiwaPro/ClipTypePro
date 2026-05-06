import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog — ClipType Pro",
  description: "Release history of ClipType Pro.",
};

const RELEASES = [
  {
    v: "2.4.0",
    d: "Apr 28, 2026",
    tag: true,
    items: [
      "Global Search (⌘K) across all views",
      "Cookie/GDPR consent banner",
      "NPS survey system",
      "Platform Warning modal for red-rated sites",
      "Dark/Light mode fully wired",
      "Churn prevention modal with 50% off offer",
      "Compliance Mode dashboard",
      "Referral programme",
      "Password reset + email verification flows",
      "Skeleton loaders & empty states",
      "Free tier character limit enforcement",
      "Annual billing toggle + coupon codes",
      "About, Changelog, Status, Security pages",
    ],
  },
  {
    v: "2.3.0",
    d: "Apr 1, 2026",
    tag: false,
    items: [
      "API Portal with endpoint docs",
      "Team audit log",
      "Snippet Marketplace",
      "Analytics dashboard",
      "Platform risk database (25 platforms)",
    ],
  },
  {
    v: "2.0.0",
    d: "Feb 14, 2026",
    tag: false,
    items: [
      "ClipType Pro v2 — full redesign",
      "Onboarding wizard with live demo",
      "Team management panel",
      "Billing with invoices",
      "Notification centre",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
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
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          What&apos;s New
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13, marginBottom: 32 }}>
          ClipType Pro release history
        </p>

        <div style={{ display: "grid", gap: 20 }}>
          {RELEASES.map((r) => (
            <div key={r.v} style={{ display: "flex", gap: 16 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: r.tag ? "var(--c-primary)" : "var(--c-border)",
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    width: 1,
                    background: "var(--c-border)",
                    marginTop: 6,
                  }}
                />
              </div>
              <div style={{ flex: 1, paddingBottom: 20 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    v{r.v}
                  </span>
                  {r.tag && (
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: 0.8,
                        background:
                          "color-mix(in srgb, var(--c-primary) 18%, transparent)",
                        color: "var(--c-primary)",
                        border:
                          "1px solid color-mix(in srgb, var(--c-primary) 30%, transparent)",
                      }}
                    >
                      LATEST
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                    {r.d}
                  </span>
                </div>
                <div style={{ display: "grid", gap: 5 }}>
                  {r.items.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: 7,
                        fontSize: 12,
                        color: "var(--c-text-dim)",
                      }}
                    >
                      <span style={{ color: "var(--c-success)", flexShrink: 0 }}>+</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
