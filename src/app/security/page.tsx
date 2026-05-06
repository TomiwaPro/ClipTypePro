import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security — ClipType Pro",
  description: "How ClipType Pro protects your data and your privacy.",
};

const SECURITY_ITEMS = [
  {
    icon: "🔐",
    title: "Zero-Knowledge Architecture",
    desc: "Your clipboard content never leaves your device. All typing simulation is processed locally — we have no technical ability to access what you type or copy.",
  },
  {
    icon: "🛡️",
    title: "AES-256 Encryption",
    desc: "All data stored on our servers is encrypted at rest using AES-256. Data in transit is protected by TLS 1.3.",
  },
  {
    icon: "🔍",
    title: "Annual Penetration Testing",
    desc: "We commission independent third-party penetration tests annually. Critical findings are remediated within 72 hours.",
  },
  {
    icon: "📋",
    title: "SOC 2 Type II (In Progress)",
    desc: "Audit in progress — estimated completion Q3 2026. Enterprise customers can request our current security controls report.",
  },
  {
    icon: "🚨",
    title: "Responsible Disclosure",
    desc: "Report vulnerabilities to security@cliptypepro.com. We acknowledge within 24 hours and resolve critical issues within 7 days.",
  },
];

export default function SecurityPage() {
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

        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Security
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13, marginBottom: 28 }}>
          How we protect your data and your privacy.
        </p>

        <div style={{ display: "grid", gap: 14 }}>
          {SECURITY_ITEMS.map((s) => (
            <div
              key={s.title}
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: 10,
                padding: 18,
                display: "flex",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>
                  {s.title}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--c-text-dim)", lineHeight: 1.65 }}
                >
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
