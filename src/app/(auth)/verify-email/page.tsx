import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResendButton } from "./resend-button";

type SearchParams = Promise<{ email?: string }>;

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const email = sp.email ?? "";

  return (
    <AuthCard
      title="Verify your email"
      subtitle="One last step before you start typing"
    >
      <div style={{ textAlign: "center", padding: "8px 0 18px" }}>
        <div
          style={{
            fontSize: 44,
            marginBottom: 14,
            animation: "pulse 2s ease infinite",
          }}
        >
          ✉️
        </div>
        <p
          style={{
            color: "var(--c-text-dim)",
            fontSize: 13,
            lineHeight: 1.65,
          }}
        >
          We sent a verification link to{" "}
          <strong style={{ color: "var(--c-text)" }}>
            {email || "your email"}
          </strong>
          . Click the link in the email to activate your account.
        </p>
      </div>

      <div
        style={{
          background: "var(--c-surface-b)",
          border: "1px solid var(--c-border)",
          borderRadius: 8,
          padding: 14,
          marginBottom: 16,
        }}
      >
        {[
          ["1", "Check your inbox", "Look for an email from noreply"],
          ["2", "Click the link", "You'll land back here, signed in"],
        ].map(([n, t, d]) => (
          <div
            key={n}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: n === "1" ? 12 : 0,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background:
                  "color-mix(in srgb, var(--c-primary) 18%, transparent)",
                color: "var(--c-primary)",
                fontWeight: 700,
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {n}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{t}</div>
              <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
                {d}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ResendButton email={email} />

      <div
        style={{
          fontSize: 11,
          color: "var(--c-text-muted)",
          marginTop: 12,
          textAlign: "center",
        }}
      >
        Check spam · Valid for 24 hours
      </div>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link
          href="/login"
          style={{ fontSize: 12, color: "var(--c-text-dim)" }}
        >
          ← Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
