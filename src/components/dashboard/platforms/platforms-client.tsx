"use client";

import { useMemo, useState } from "react";

export type Platform = {
  id: string;
  name: string;
  category: string;
  riskLevel: "green" | "yellow" | "red";
  notes: string | null;
};

const RISK_LABEL: Record<Platform["riskLevel"], string> = {
  green: "Low risk",
  yellow: "Caution",
  red: "High risk",
};

type RiskFilter = "all" | Platform["riskLevel"];

export function PlatformsClient({ platforms }: { platforms: Platform[] }) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return platforms.filter((p) => {
      if (risk !== "all" && p.riskLevel !== risk) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.notes?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [platforms, query, risk]);

  const counts = useMemo(() => {
    const c = { all: platforms.length, green: 0, yellow: 0, red: 0 };
    for (const p of platforms) c[p.riskLevel]++;
    return c;
  }, [platforms]);

  return (
    <div className="fade-up" style={{ display: "grid", gap: 14, maxWidth: 920 }}>
      <div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Platform Risk Ratings
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          {platforms.length} platforms rated for typing-detection risk
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search platforms…"
          style={{
            flex: "1 1 220px",
            minWidth: 200,
            background: "var(--c-surface-b)",
            border: "1px solid var(--c-border)",
            borderRadius: 7,
            padding: "8px 12px",
            color: "var(--c-text)",
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            outline: "none",
          }}
        />
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            padding: 4,
            borderRadius: 8,
            border: "1px solid var(--c-border)",
            background: "var(--c-surface-b)",
          }}
        >
          {(["all", "green", "yellow", "red"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRisk(r)}
              style={pillBtn(risk === r, r)}
            >
              {r === "all"
                ? `All · ${counts.all}`
                : `${capitalize(r)} · ${counts[r]}`}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState query={query} risk={risk} />
      ) : (
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {filtered.map((p, i) => {
            const isOpen = openId === p.id;
            return (
              <div
                key={p.id}
                style={{
                  borderBottom:
                    i === filtered.length - 1
                      ? "none"
                      : "1px solid var(--c-border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : p.id)}
                  className="hover-row"
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 14,
                    alignItems: "center",
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    color: "var(--c-text)",
                    cursor: p.notes ? "pointer" : "default",
                    textAlign: "left",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {p.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "var(--c-text-muted)" }}
                    >
                      {p.category}
                    </div>
                  </div>
                  <RiskPill level={p.riskLevel} />
                  <span
                    aria-hidden
                    style={{
                      color: "var(--c-text-muted)",
                      fontSize: 11,
                      width: 14,
                      textAlign: "center",
                      transform: isOpen ? "rotate(90deg)" : "none",
                      transition: "transform .15s",
                      visibility: p.notes ? "visible" : "hidden",
                    }}
                  >
                    ›
                  </span>
                </button>
                {isOpen && p.notes && (
                  <div
                    style={{
                      padding: "0 16px 14px 16px",
                      fontSize: 12,
                      color: "var(--c-text-dim)",
                      lineHeight: 1.6,
                    }}
                  >
                    {p.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RiskPill({ level }: { level: Platform["riskLevel"] }) {
  const color =
    level === "green"
      ? "var(--c-success)"
      : level === "yellow"
        ? "var(--c-warning)"
        : "var(--c-danger)";
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.6,
        padding: "3px 8px",
        borderRadius: 4,
        textTransform: "uppercase",
        color,
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      {RISK_LABEL[level]}
    </span>
  );
}

function EmptyState({ query, risk }: { query: string; risk: RiskFilter }) {
  const hasFilters = query.trim() !== "" || risk !== "all";
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 28,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 8 }}>🔎</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
        {hasFilters ? "No matches" : "No platforms"}
      </div>
      <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
        {hasFilters
          ? "Try a different search or clear the filters."
          : "Platform ratings haven't been seeded yet."}
      </div>
    </div>
  );
}

function pillBtn(active: boolean, kind: RiskFilter): React.CSSProperties {
  const accent =
    kind === "all"
      ? "var(--c-text)"
      : kind === "green"
        ? "var(--c-success)"
        : kind === "yellow"
          ? "var(--c-warning)"
          : "var(--c-danger)";
  return {
    padding: "5px 12px",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    background: active ? "var(--c-surface)" : "transparent",
    color: active ? accent : "var(--c-text-dim)",
    border: active ? "1px solid var(--c-border)" : "1px solid transparent",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
