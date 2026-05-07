"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SessionRow = {
  charCount: number;
  wordCount: number;
  avgWpm: number;
  durationSeconds: number;
  createdAt: string;
};

export type TopSnippet = {
  id: string;
  title: string;
  category: string;
  useCount: number;
};

type Range = "7d" | "30d" | "90d";

const RANGE_LABEL: Record<Range, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export function AnalyticsClient({
  range,
  sessions,
  topSnippets,
  rangeDays,
}: {
  range: Range;
  sessions: SessionRow[];
  topSnippets: TopSnippet[];
  rangeDays: number;
}) {
  const router = useRouter();
  // Capture "now" once at mount so the daily-activity buckets are stable
  // across re-renders. useState initializer is pure per React's rules.
  const [nowMs] = useState(() => Date.now());

  const stats = useMemo(() => {
    const totalChars = sessions.reduce((a, s) => a + s.charCount, 0);
    const totalSec = sessions.reduce((a, s) => a + s.durationSeconds, 0);
    const totalSessions = sessions.length;
    const avgWpm =
      totalSessions > 0
        ? Math.round(
            sessions.reduce((a, s) => a + s.avgWpm, 0) / totalSessions,
          )
        : 0;
    // Hours saved: assume manual typing at 25 WPM (5 chars per word).
    // Time-to-type-by-hand minus actual session duration.
    const manualSec = (totalChars / 5 / 25) * 60;
    const savedSec = Math.max(0, manualSec - totalSec);
    return {
      totalChars,
      totalSessions,
      avgWpm,
      hoursSaved: Math.round((savedSec / 3600) * 10) / 10,
    };
  }, [sessions]);

  // Last 7 sessions for the WPM trend, regardless of selected range —
  // the chart is "recent performance", not "performance over the range".
  const wpmTrend = useMemo(() => {
    return sessions
      .slice(-7)
      .map((s, i) => ({
        idx: i + 1,
        wpm: s.avgWpm,
        label: shortDate(s.createdAt),
      }));
  }, [sessions]);

  // Daily aggregate for the bar chart, bucketed by UTC day.
  const dailyActivity = useMemo(() => {
    const days: Record<string, { date: string; chars: number; sessions: number }> = {};
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date(nowMs - i * 86400000);
      const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      days[key] = { date: shortDate(d.toISOString()), chars: 0, sessions: 0 };
    }
    for (const s of sessions) {
      const d = new Date(s.createdAt);
      const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      const bucket = days[key];
      if (bucket) {
        bucket.chars += s.charCount;
        bucket.sessions += 1;
      }
    }
    return Object.values(days);
  }, [sessions, rangeDays, nowMs]);

  const onRangeChange = (next: Range) => {
    if (next === range) return;
    router.push(`/dashboard/analytics?range=${next}`);
  };

  if (sessions.length === 0) {
    return (
      <div
        className="fade-up"
        style={{ display: "grid", gap: 14, maxWidth: 720 }}
      >
        <Header range={range} onChange={onRangeChange} />
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            No sessions in this range yet
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--c-text-dim)",
              maxWidth: 360,
              margin: "0 auto",
              lineHeight: 1.55,
            }}
          >
            Open the Typer and run a session — your stats will land here.
          </div>
          <Link
            href="/dashboard/typer"
            style={{
              display: "inline-block",
              marginTop: 14,
              padding: "9px 16px",
              borderRadius: 8,
              background: "var(--c-primary)",
              color: "#000",
              border: "none",
              fontWeight: 700,
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            Open Typer →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ display: "grid", gap: 14, maxWidth: 920 }}>
      <Header range={range} onChange={onRangeChange} />

      {/* KPI cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 10,
        }}
      >
        <Kpi label="Total chars typed" value={stats.totalChars.toLocaleString()} />
        <Kpi label="Sessions" value={stats.totalSessions.toLocaleString()} />
        <Kpi label="Average WPM" value={stats.avgWpm.toString()} />
        <Kpi
          label="Hours saved"
          value={stats.hoursSaved.toString()}
          accent
        />
      </div>

      {/* WPM trend */}
      <ChartCard title="WPM — last 7 sessions">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={wpmTrend}
            margin={{ top: 8, right: 14, bottom: 4, left: -10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
            <XAxis
              dataKey="label"
              stroke="var(--c-text-muted)"
              fontSize={11}
            />
            <YAxis stroke="var(--c-text-muted)" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: 6,
                fontSize: 12,
                color: "var(--c-text)",
              }}
              cursor={{ stroke: "var(--c-border)" }}
            />
            <Line
              type="monotone"
              dataKey="wpm"
              stroke="var(--c-primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--c-primary)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Daily activity */}
      <ChartCard title={`Activity by day — ${RANGE_LABEL[range]}`}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={dailyActivity}
            margin={{ top: 8, right: 14, bottom: 4, left: -10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
            <XAxis
              dataKey="date"
              stroke="var(--c-text-muted)"
              fontSize={11}
              interval="preserveStartEnd"
            />
            <YAxis stroke="var(--c-text-muted)" fontSize={11} />
            <Tooltip
              contentStyle={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: 6,
                fontSize: 12,
                color: "var(--c-text)",
              }}
              cursor={{ fill: "color-mix(in srgb, var(--c-primary) 8%, transparent)" }}
            />
            <Bar
              dataKey="chars"
              name="Chars typed"
              fill="var(--c-primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Top snippets */}
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "13px 16px",
            borderBottom: "1px solid var(--c-border)",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Top snippets by use count
        </div>
        {topSnippets.length === 0 ? (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              fontSize: 12,
              color: "var(--c-text-dim)",
            }}
          >
            No snippet usage yet. Insert a snippet from the typer to start
            tracking.
          </div>
        ) : (
          topSnippets.map((s, i) => (
            <div
              key={s.id}
              className="hover-row"
              style={{
                padding: "11px 16px",
                borderBottom:
                  i === topSnippets.length - 1
                    ? "none"
                    : "1px solid var(--c-border)",
                display: "flex",
                gap: 12,
                alignItems: "center",
                fontSize: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--c-text-muted)",
                  width: 24,
                  textAlign: "right",
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1, fontWeight: 600 }}>{s.title}</span>
              <span style={{ color: "var(--c-text-muted)", fontSize: 11 }}>
                {s.category}
              </span>
              <span
                style={{
                  color: "var(--c-primary)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  minWidth: 32,
                  textAlign: "right",
                }}
              >
                {s.useCount}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Header({
  range,
  onChange,
}: {
  range: Range;
  onChange: (next: Range) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-end",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Analytics
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          {RANGE_LABEL[range]}
        </p>
      </div>
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
        {(["7d", "30d", "90d"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            style={{
              padding: "5px 12px",
              borderRadius: 5,
              fontSize: 11,
              fontWeight: 600,
              background: range === r ? "var(--c-surface)" : "transparent",
              color: range === r ? "var(--c-text)" : "var(--c-text-dim)",
              border:
                range === r ? "1px solid var(--c-border)" : "1px solid transparent",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
          </button>
        ))}
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

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
