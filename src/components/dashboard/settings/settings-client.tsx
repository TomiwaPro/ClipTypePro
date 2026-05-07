"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useTheme } from "@/components/theme-provider";
import {
  deleteAllSnippetsAction,
  exportUserDataAction,
  updateEmailAction,
  updateNotificationPrefsAction,
  updatePasswordAction,
  updateProfileAction,
  updateTypingSettingsAction,
} from "@/app/dashboard/settings/actions";

export type TypingSettings = {
  typo_simulation: boolean;
  pause_on_focus: boolean;
  auto_clear: boolean;
  show_wpm: boolean;
  countdown_seconds: number;
  default_speed: "stealth" | "human" | "balanced" | "fast" | "instant";
  human_mode: boolean;
};

export type NotificationPreferences = {
  email_billing: boolean;
  email_security: boolean;
  email_product_updates: boolean;
  in_app_alerts: boolean;
  in_app_platform_warnings: boolean;
};

export function SettingsClient({
  fullName,
  email,
  typingSettings,
  notificationPreferences,
}: {
  fullName: string;
  email: string;
  typingSettings: TypingSettings;
  notificationPreferences: NotificationPreferences;
}) {
  return (
    <div
      className="fade-up"
      style={{ display: "grid", gap: 18, maxWidth: 720 }}
    >
      <div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Settings
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          Preferences and account controls
        </p>
      </div>

      <ProfileSection initialName={fullName} initialEmail={email} />
      <PasswordSection />
      <ThemeSection />
      <TypingSection initial={typingSettings} />
      <NotificationsSection initial={notificationPreferences} />
      <PrivacyDataSection />
    </div>
  );
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function ProfileSection({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    const nameChanged = fullName.trim() !== initialName.trim();
    const emailChanged =
      email.trim().toLowerCase() !== initialEmail.trim().toLowerCase();
    if (!nameChanged && !emailChanged) {
      toast.info("Nothing to save");
      return;
    }

    startTransition(async () => {
      if (nameChanged) {
        const r = await updateProfileAction({ fullName: fullName.trim() });
        if (!r.ok) {
          toast.error("Couldn't save name", { description: r.error });
          return;
        }
      }
      if (emailChanged) {
        const r = await updateEmailAction({ email: email.trim() });
        if (!r.ok) {
          toast.error("Couldn't change email", { description: r.error });
          return;
        }
        if (r.needsConfirmation) {
          toast.success("Confirmation email sent", {
            description: `Click the link sent to ${email.trim()} to finish the change.`,
          });
        }
      } else if (nameChanged) {
        toast.success("Profile updated");
      }
    });
  };

  return (
    <Card title="Profile">
      <Field label="Full name">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={80}
          style={inputStyle()}
        />
      </Field>
      <Field
        label="Email"
        hint="Changing your email sends a confirmation link to the new address. Until you confirm, sign-in still uses the old email."
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle()}
        />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={onSave} disabled={pending} style={primaryBtn(pending)}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </Card>
  );
}

// ─── Password ────────────────────────────────────────────────────────────────

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  const onSave = () => {
    if (!current || !next || !confirm) {
      toast.error("Fill every password field");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords don't match");
      return;
    }
    startTransition(async () => {
      const r = await updatePasswordAction({
        currentPassword: current,
        newPassword: next,
        confirmPassword: confirm,
      });
      if (!r.ok) {
        toast.error("Couldn't change password", { description: r.error });
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password updated");
    });
  };

  return (
    <Card title="Password">
      <Field label="Current password">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          style={inputStyle()}
        />
      </Field>
      <Field label="New password" hint="At least 8 characters.">
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          style={inputStyle()}
        />
      </Field>
      <Field label="Confirm new password">
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          style={inputStyle()}
        />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={onSave} disabled={pending} style={primaryBtn(pending)}>
          {pending ? "Updating…" : "Change password"}
        </button>
      </div>
    </Card>
  );
}

// ─── Theme ───────────────────────────────────────────────────────────────────

function ThemeSection() {
  const { theme, setTheme } = useTheme();

  // The dashboard layout's <ThemeSeed> handles cross-device sync — it
  // adopts profile.theme_preference on a fresh device and persists every
  // change to the DB. This panel just toggles the local store.

  return (
    <Card title="Appearance" subtitle="Mirrors the topbar toggle and follows you across devices.">
      <div
        role="tablist"
        aria-label="Theme"
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 4,
          borderRadius: 8,
          border: "1px solid var(--c-border)",
          background: "var(--c-surface-b)",
        }}
      >
        {(["light", "dark"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={theme === t}
            onClick={() => setTheme(t)}
            style={pillBtn(theme === t)}
          >
            {t === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
        ))}
      </div>
    </Card>
  );
}

// ─── Typing behaviour ────────────────────────────────────────────────────────

function TypingSection({ initial }: { initial: TypingSettings }) {
  const [s, setS] = useState<TypingSettings>(initial);
  const [pending, startTransition] = useTransition();

  const update = (patch: Partial<TypingSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    startTransition(async () => {
      const r = await updateTypingSettingsAction(next);
      if (!r.ok) {
        toast.error("Couldn't save typing settings", { description: r.error });
        setS(s); // rollback
      }
    });
  };

  return (
    <Card title="Typing behaviour">
      <Toggle
        label="Typo simulation"
        hint="Inserts and corrects realistic typos."
        checked={s.typo_simulation}
        onChange={(v) => update({ typo_simulation: v })}
      />
      <Toggle
        label="Pause on focus loss"
        hint="Auto-pause if you click away mid-session."
        checked={s.pause_on_focus}
        onChange={(v) => update({ pause_on_focus: v })}
      />
      <Toggle
        label="Auto-clear after session"
        hint="Empty the typer after each completed run."
        checked={s.auto_clear}
        onChange={(v) => update({ auto_clear: v })}
      />
      <Toggle
        label="Show live WPM"
        hint="Display words-per-minute counter while typing."
        checked={s.show_wpm}
        onChange={(v) => update({ show_wpm: v })}
      />
      <Toggle
        label="Human mode"
        hint="Variable cadence, natural pauses."
        checked={s.human_mode}
        onChange={(v) => update({ human_mode: v })}
      />
      <Field label="Default speed">
        <select
          value={s.default_speed}
          onChange={(e) =>
            update({
              default_speed: e.target.value as TypingSettings["default_speed"],
            })
          }
          style={inputStyle()}
          disabled={pending}
        >
          <option value="stealth">Stealth (~30 WPM)</option>
          <option value="human">Human (~60 WPM)</option>
          <option value="balanced">Balanced (~100 WPM)</option>
          <option value="fast">Fast (~150 WPM)</option>
          <option value="instant">Instant</option>
        </select>
      </Field>
      <Field label={`Countdown duration: ${s.countdown_seconds}s`}>
        <input
          type="range"
          min={0}
          max={10}
          value={s.countdown_seconds}
          onChange={(e) =>
            update({ countdown_seconds: Number(e.target.value) })
          }
          disabled={pending}
          style={{ width: "100%" }}
        />
      </Field>
    </Card>
  );
}

// ─── Notifications ───────────────────────────────────────────────────────────

function NotificationsSection({
  initial,
}: {
  initial: NotificationPreferences;
}) {
  const [p, setP] = useState<NotificationPreferences>(initial);

  const update = (patch: Partial<NotificationPreferences>) => {
    const next = { ...p, ...patch };
    setP(next);
    void (async () => {
      const r = await updateNotificationPrefsAction(next);
      if (!r.ok) {
        toast.error("Couldn't save notification preferences", {
          description: r.error,
        });
        setP(p); // rollback
      }
    })();
  };

  return (
    <Card title="Notifications">
      <SectionLabel>Email</SectionLabel>
      <Toggle
        label="Billing & invoice emails"
        checked={p.email_billing}
        onChange={(v) => update({ email_billing: v })}
      />
      <Toggle
        label="Security & sign-in alerts"
        checked={p.email_security}
        onChange={(v) => update({ email_security: v })}
      />
      <Toggle
        label="Product updates"
        checked={p.email_product_updates}
        onChange={(v) => update({ email_product_updates: v })}
      />
      <SectionLabel>In-app</SectionLabel>
      <Toggle
        label="System alerts"
        checked={p.in_app_alerts}
        onChange={(v) => update({ in_app_alerts: v })}
      />
      <Toggle
        label="Platform-risk warnings"
        hint="Alert before typing on red-rated platforms."
        checked={p.in_app_platform_warnings}
        onChange={(v) => update({ in_app_platform_warnings: v })}
      />
    </Card>
  );
}

// ─── Privacy & data ──────────────────────────────────────────────────────────

function PrivacyDataSection() {
  const [exporting, setExporting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    const r = await exportUserDataAction();
    setExporting(false);
    if (!r.ok || !r.data) {
      toast.error("Couldn't build export", { description: r.error });
      return;
    }
    // Trigger a download client-side. Avoids a server round-trip and
    // streams the JSON straight from the action's return value.
    const blob = new Blob([JSON.stringify(r.data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cliptypepro-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Export ready");
  };

  const onDelete = async () => {
    setDeleting(true);
    const r = await deleteAllSnippetsAction();
    setDeleting(false);
    setConfirmingDelete(false);
    if (!r.ok) {
      toast.error("Couldn't delete snippets", { description: r.error });
      return;
    }
    toast.success(`Deleted ${r.deleted ?? 0} snippet${r.deleted === 1 ? "" : "s"}`);
  };

  return (
    <Card title="Privacy & data">
      <Row
        label="Export my data"
        hint="Download a JSON file with your snippets, sessions, and profile."
      >
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          style={ghostBtn(exporting)}
        >
          {exporting ? "Preparing…" : "Download"}
        </button>
      </Row>
      <Row label="Privacy Policy" hint="Read how we handle your data.">
        <Link
          href="/privacy"
          style={{
            padding: "8px 14px",
            borderRadius: 7,
            background: "var(--c-surface-b)",
            color: "var(--c-text)",
            border: "1px solid var(--c-border)",
            fontWeight: 600,
            fontSize: 12,
            textDecoration: "none",
            fontFamily: "var(--font-sans)",
          }}
        >
          Open
        </Link>
      </Row>
      <Row
        label="Delete snippet library"
        hint="Permanently delete every snippet you've created. Sessions and profile are kept."
      >
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            style={dangerBtn(false)}
          >
            Delete all snippets
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              style={ghostBtn(deleting)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              style={dangerBtn(deleting)}
            >
              {deleting ? "Deleting…" : "Yes, delete everything"}
            </button>
          </div>
        )}
      </Row>
    </Card>
  );
}

// ─── Reusable bits ───────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
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
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        {subtitle && (
          <div
            style={{
              fontSize: 11,
              color: "var(--c-text-muted)",
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        color: "var(--c-text-muted)",
      }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text)" }}>
        {label}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
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
      {children}
    </div>
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
    <Row label={label} hint={hint}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 11,
          background: checked
            ? "var(--c-primary)"
            : "var(--c-surface-b)",
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
    </Row>
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

function pillBtn(active: boolean): React.CSSProperties {
  return {
    padding: "5px 12px",
    borderRadius: 5,
    fontSize: 11,
    fontWeight: 600,
    background: active ? "var(--c-surface)" : "transparent",
    color: active ? "var(--c-text)" : "var(--c-text-dim)",
    border: active ? "1px solid var(--c-border)" : "1px solid transparent",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
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

function dangerBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 7,
    background: "color-mix(in srgb, var(--c-danger) 18%, transparent)",
    color: "var(--c-danger)",
    border: "1px solid color-mix(in srgb, var(--c-danger) 40%, transparent)",
    fontWeight: 600,
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "var(--font-sans)",
  };
}
