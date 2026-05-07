"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  exportAuditLogAction,
  submitGdprRequestAction,
  updateComplianceFlagsAction,
} from "@/app/dashboard/compliance/actions";

type Flags = {
  compliance_mode: boolean;
  hipaa_baa_accepted: boolean;
  gdpr_dpa_accepted: boolean;
};

type GdprType =
  | "access"
  | "rectification"
  | "erasure"
  | "portability"
  | "objection";

const GDPR_OPTIONS: Array<{ value: GdprType; label: string; hint: string }> = [
  {
    value: "access",
    label: "Right to access",
    hint: "Get a copy of all personal data we hold about you.",
  },
  {
    value: "rectification",
    label: "Right to rectification",
    hint: "Correct inaccurate personal data.",
  },
  {
    value: "erasure",
    label: "Right to erasure",
    hint: 'Also called "right to be forgotten".',
  },
  {
    value: "portability",
    label: "Right to data portability",
    hint: "Receive your data in a structured, machine-readable format.",
  },
  {
    value: "objection",
    label: "Right to object",
    hint: "Object to specific processing of your data.",
  },
];

export function ComplianceClient({
  complianceMode,
  hipaaBaa,
  gdprDpa,
}: {
  complianceMode: boolean;
  hipaaBaa: boolean;
  gdprDpa: boolean;
}) {
  const [flags, setFlags] = useState<Flags>({
    compliance_mode: complianceMode,
    hipaa_baa_accepted: hipaaBaa,
    gdpr_dpa_accepted: gdprDpa,
  });

  const update = (patch: Partial<Flags>) => {
    const next = { ...flags, ...patch };
    setFlags(next);
    void (async () => {
      const r = await updateComplianceFlagsAction(next);
      if (!r.ok) {
        toast.error("Couldn't save", { description: r.error });
        setFlags(flags); // rollback
      }
    })();
  };

  return (
    <div className="fade-up" style={{ display: "grid", gap: 18, maxWidth: 760 }}>
      <div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Compliance
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          HIPAA · GDPR · SOC 2 — toggles, agreements, and data subject rights.
        </p>
      </div>

      <Card title="Compliance toggles">
        <Toggle
          label="Compliance Mode"
          hint="Enables full audit logging, longer retention, and SSO enforcement (where supported)."
          checked={flags.compliance_mode}
          onChange={(v) => update({ compliance_mode: v })}
        />
        <Toggle
          label="HIPAA BAA acknowledged"
          hint="I have read and accept the Business Associate Agreement."
          checked={flags.hipaa_baa_accepted}
          onChange={(v) => update({ hipaa_baa_accepted: v })}
        />
        <Toggle
          label="GDPR DPA acknowledged"
          hint="I have read and accept the Data Processing Addendum."
          checked={flags.gdpr_dpa_accepted}
          onChange={(v) => update({ gdpr_dpa_accepted: v })}
        />
      </Card>

      <SocSection />

      <GdprSection />

      <AuditSection />
    </div>
  );
}

// ─── SOC 2 progress (static) ─────────────────────────────────────────────────

function SocSection() {
  const pct = 62;
  return (
    <Card title="SOC 2 Type II">
      <div style={{ fontSize: 12, color: "var(--c-text-dim)", lineHeight: 1.55 }}>
        Audit in progress with our third-party assessor. Final report expected
        Q3 2026.
      </div>
      <div
        style={{
          background: "var(--c-surface-b)",
          border: "1px solid var(--c-border)",
          borderRadius: 8,
          height: 10,
          overflow: "hidden",
          marginTop: 4,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--c-primary)",
            transition: "width .3s ease",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--c-text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {pct}% complete
      </div>
    </Card>
  );
}

// ─── GDPR rights ─────────────────────────────────────────────────────────────

function GdprSection() {
  const [type, setType] = useState<GdprType>("access");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const onSubmit = async () => {
    setBusy(true);
    const r = await submitGdprRequestAction({ type, details });
    setBusy(false);
    if (!r.ok) {
      toast.error("Couldn't submit request", { description: r.error });
      return;
    }
    setSubmittedAt(new Date().toISOString());
    setDetails("");
    toast.success("Request sent", {
      description: "We'll reply within 30 days as required by GDPR.",
    });
  };

  const selected = GDPR_OPTIONS.find((o) => o.value === type)!;

  return (
    <Card title="GDPR data subject rights">
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Request type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as GdprType)}
            disabled={busy}
            style={inputStyle()}
          >
            {GDPR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
            {selected.hint}
          </span>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>
            Details (optional)
          </span>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Anything we should know about your request"
            disabled={busy}
            style={{ ...inputStyle(), resize: "vertical" }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            style={primaryBtn(busy)}
          >
            {busy ? "Sending…" : "Submit request"}
          </button>
        </div>

        {submittedAt && (
          <div
            style={{
              fontSize: 11,
              color: "var(--c-success)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ✓ Submitted at {new Date(submittedAt).toISOString()}
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Audit log export ────────────────────────────────────────────────────────

function AuditSection() {
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    const r = await exportAuditLogAction();
    setBusy(false);
    if (!r.ok || !r.data) {
      toast.error("Couldn't build audit log", { description: r.error });
      return;
    }
    const blob = new Blob([JSON.stringify(r.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cliptypepro-audit-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Audit log ready");
  };

  return (
    <Card title="Audit log">
      <div
        style={{
          fontSize: 12,
          color: "var(--c-text-dim)",
          lineHeight: 1.55,
        }}
      >
        Download every typing session you&rsquo;ve ever run as JSON. Safe to
        share with auditors — only metadata, not the typed text.
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onExport}
          disabled={busy}
          style={ghostBtn(busy)}
        >
          {busy ? "Building…" : "Download audit log"}
        </button>
      </div>
    </Card>
  );
}

// ─── Reusable bits ───────────────────────────────────────────────────────────

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 18,
        display: "grid",
        gap: 12,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
      {children}
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {hint && (
          <div
            style={{
              fontSize: 11,
              color: "var(--c-text-muted)",
              marginTop: 2,
              lineHeight: 1.5,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 11,
          background: checked ? "var(--c-primary)" : "var(--c-surface-b)",
          border: `1px solid ${checked ? "var(--c-primary)" : "var(--c-border)"}`,
          padding: 2,
          cursor: "pointer",
          position: "relative",
          transition: "background .15s, border-color .15s",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "block",
            width: 16,
            height: 16,
            borderRadius: 8,
            background: checked ? "#000" : "var(--c-text-muted)",
            transform: checked ? "translateX(16px)" : "translateX(0)",
            transition: "transform .15s",
          }}
        />
      </button>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    background: "var(--c-surface-b)",
    border: "1px solid var(--c-border)",
    borderRadius: 7,
    padding: "8px 10px",
    color: "var(--c-text)",
    fontSize: 13,
    fontFamily: "var(--font-sans)",
    outline: "none",
    width: "100%",
  };
}

function primaryBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 7,
    background: "var(--c-primary)",
    color: "#000",
    border: "none",
    fontWeight: 700,
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "var(--font-sans)",
  };
}

function ghostBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 7,
    background: "var(--c-surface-b)",
    color: "var(--c-text)",
    border: "1px solid var(--c-border)",
    fontWeight: 600,
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    fontFamily: "var(--font-sans)",
  };
}
