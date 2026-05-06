"use client";

import { estimatePasswordStrength } from "@/lib/auth/schemas";

const COLORS = [
  "var(--c-border)",   // 0 — empty
  "var(--c-danger)",   // 1 — weak
  "var(--c-warning)",  // 2 — fair
  "var(--c-primary)",  // 3 — strong
  "var(--c-success)",  // 4 — excellent
];

export function PasswordStrengthMeter({ value }: { value: string }) {
  const { score, label } = estimatePasswordStrength(value);
  const color = COLORS[score];

  return (
    <div style={{ marginTop: 6 }} aria-live="polite">
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: value ? 4 : 0,
          height: value ? 4 : 0,
          overflow: "hidden",
          transition: "height .15s",
        }}
      >
        {[1, 2, 3, 4].map((bar) => (
          <div
            key={bar}
            style={{
              flex: 1,
              borderRadius: 2,
              background: bar <= score ? color : "var(--c-border)",
              transition: "background .15s",
            }}
          />
        ))}
      </div>
      {value && (
        <div style={{ fontSize: 10, color, fontWeight: 600 }}>{label}</div>
      )}
    </div>
  );
}
