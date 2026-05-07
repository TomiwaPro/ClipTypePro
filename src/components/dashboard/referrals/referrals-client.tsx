"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export type ReferralRow = {
  id: string;
  email: string;
  status: "pending" | "signed_up" | "converted";
  earnedMonths: number;
  createdAt: string;
};

const STATUS_LABEL: Record<ReferralRow["status"], string> = {
  pending: "Invited",
  signed_up: "Signed up",
  converted: "Converted",
};

export function ReferralsClient({
  referralCode,
  referralLink,
  referrals,
  stats,
}: {
  referralCode: string | null;
  referralLink: string | null;
  referrals: ReferralRow[];
  stats: { referred: number; converted: number; monthsEarned: number };
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy", {
        description: "Long-press the link to copy manually.",
      });
    }
  };

  return (
    <div className="fade-up" style={{ display: "grid", gap: 14, maxWidth: 760 }}>
      <div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Refer friends — earn free Pro months
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          Get one free month of Pro for every friend who upgrades. No cap.
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        <Kpi label="Friends referred" value={stats.referred.toString()} />
        <Kpi label="Converted to Pro" value={stats.converted.toString()} />
        <Kpi
          label="Free months earned"
          value={stats.monthsEarned.toString()}
          accent
        />
      </div>

      {/* Share */}
      {referralCode && referralLink ? (
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
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              Your referral link
            </div>
            <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
              Share anywhere. When a friend upgrades to Pro, you both get
              rewarded.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "stretch",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              readOnly
              value={referralLink}
              onFocus={(e) => e.target.select()}
              style={{
                flex: 1,
                minWidth: 240,
                background: "var(--c-surface-b)",
                border: "1px solid var(--c-border)",
                borderRadius: 7,
                padding: "9px 12px",
                color: "var(--c-text)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={onCopy}
              style={{
                padding: "9px 16px",
                borderRadius: 7,
                background: copied ? "var(--c-success)" : "var(--c-primary)",
                color: "#000",
                border: "none",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                transition: "background .15s",
                fontFamily: "var(--font-sans)",
              }}
            >
              {copied ? "✓ Copied" : "Copy link"}
            </button>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--c-text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Code: {referralCode}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: "var(--c-surface)",
            border:
              "1px solid color-mix(in srgb, var(--c-warning) 33%, transparent)",
            borderRadius: 10,
            padding: 18,
            fontSize: 12,
            color: "var(--c-text-dim)",
            lineHeight: 1.55,
          }}
        >
          Your referral code is being generated. Apply migration 004 in the
          Supabase SQL editor (adds <code>profiles.referral_code</code>) and
          refresh this page.
        </div>
      )}

      {/* History */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
          Referral history
        </div>
        {referrals.length === 0 ? (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>🎁</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              No referrals yet
            </div>
            <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
              Share your link — every signup that converts to Pro earns you a
              free month.
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {referrals.map((r, i) => (
              <div
                key={r.id}
                style={{
                  padding: "12px 16px",
                  borderBottom:
                    i === referrals.length - 1
                      ? "none"
                      : "1px solid var(--c-border)",
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                  }}
                >
                  {r.email}
                </span>
                <span style={{ color: "var(--c-text-muted)", fontSize: 11 }}>
                  {formatDate(r.createdAt)}
                </span>
                <StatusPill status={r.status} />
                <span
                  style={{
                    color: "var(--c-success)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    minWidth: 36,
                    textAlign: "right",
                  }}
                >
                  {r.earnedMonths > 0 ? `+${r.earnedMonths}mo` : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          color: "var(--c-text-muted)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 22,
          fontWeight: 700,
          color: accent ? "var(--c-success)" : "var(--c-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ReferralRow["status"] }) {
  const color =
    status === "converted"
      ? "var(--c-success)"
      : status === "signed_up"
        ? "var(--c-primary)"
        : "var(--c-text-muted)";
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.6,
        padding: "3px 7px",
        borderRadius: 4,
        textTransform: "uppercase",
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
