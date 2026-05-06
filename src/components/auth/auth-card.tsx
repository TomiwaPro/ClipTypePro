import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

/**
 * Centered auth card layout shared by every auth page (login, signup,
 * verify-email, forgot-password, reset-password). Uses theme tokens so
 * it flips with dark/light mode automatically. Includes a top-right
 * theme toggle so users can switch themes from any auth page.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <ThemeToggle />
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 18,
              fontWeight: 700,
              display: "inline-block",
              marginBottom: 14,
              textDecoration: "none",
            }}
          >
            <span style={{ color: "var(--c-primary)" }}>Clip</span>
            <span style={{ color: "var(--c-text)" }}>Type</span>
            <span style={{ color: "var(--c-accent)" }}>Pro</span>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{title}</h1>
          {subtitle && (
            <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>{subtitle}</p>
          )}
        </div>

        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            padding: 22,
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              textAlign: "center",
              marginTop: 18,
              fontSize: 13,
              color: "var(--c-text-dim)",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Reusable form atoms (kept inline-styled to match the v4 prototype) ──────

export const fieldLabelStyle = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: "var(--c-text-muted)",
  textTransform: "uppercase" as const,
  marginBottom: 7,
};

export const fieldInputStyle = (hasError: boolean) => ({
  width: "100%",
  background: "var(--c-surface-b)",
  border: `1px solid ${hasError ? "var(--c-danger)" : "var(--c-border)"}`,
  borderRadius: 7,
  padding: "10px 13px",
  color: "var(--c-text)",
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  boxSizing: "border-box" as const,
  outline: "none",
});

export const fieldErrorStyle = {
  fontSize: 11,
  color: "var(--c-danger)",
  marginTop: 4,
};

export const primaryButtonStyle = (loading: boolean) => ({
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  gap: 6,
  width: "100%",
  padding: 12,
  borderRadius: 8,
  border: "none",
  background: "var(--c-primary)",
  color: "#000",
  fontWeight: 600,
  fontSize: 14,
  cursor: loading ? "not-allowed" : "pointer",
  opacity: loading ? 0.6 : 1,
  fontFamily: "var(--font-sans)",
});

export const ghostButtonStyle = {
  display: "inline-flex" as const,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  gap: 6,
  width: "100%",
  padding: 11,
  borderRadius: 8,
  border: "1px solid var(--c-border)",
  background: "transparent",
  color: "var(--c-text)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};
