"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate } from "@/lib/format";
import {
  inviteTeamMemberAction,
  removeTeamMemberAction,
  updateTeamMemberRoleAction,
} from "@/app/dashboard/team/actions";

export type TeamMemberRow = {
  id: string;
  userId: string | null;
  role: "admin" | "member" | "viewer";
  status: "active" | "invited";
  email: string;
  fullName: string | null;
  joinedAt: string | null;
  charsTyped: number;
  recentSessionCount: number;
};

export type SessionRow = {
  id: string;
  userId: string;
  userDisplay: string;
  charCount: number;
  avgWpm: number;
  targetApp: string | null;
  durationSeconds: number;
  createdAt: string;
};

type Tab = "members" | "usage" | "audit";

export function TeamClient({
  teamId,
  teamName,
  currentUserId,
  isAdmin,
  members,
  sessions,
}: {
  teamId: string;
  teamName: string;
  currentUserId: string;
  isAdmin: boolean;
  members: TeamMemberRow[];
  sessions: SessionRow[];
}) {
  const [tab, setTab] = useState<Tab>("members");

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
          {teamName}
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          {members.filter((m) => m.status === "active").length} active member
          {members.filter((m) => m.status === "active").length === 1 ? "" : "s"}
          {members.some((m) => m.status === "invited") &&
            ` · ${members.filter((m) => m.status === "invited").length} invited`}
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Team tabs"
        style={{
          display: "inline-flex",
          gap: 4,
          padding: 4,
          borderRadius: 8,
          border: "1px solid var(--c-border)",
          background: "var(--c-surface-b)",
          alignSelf: "flex-start",
        }}
      >
        {(["members", "usage", "audit"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={pillBtn(tab === t)}
          >
            {t === "members" ? "Members" : t === "usage" ? "Usage" : "Audit"}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <MembersTab
          teamId={teamId}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          members={members}
        />
      )}
      {tab === "usage" && <UsageTab members={members} />}
      {tab === "audit" && <AuditTab sessions={sessions} />}
    </div>
  );
}

// ─── Members tab ─────────────────────────────────────────────────────────────

function MembersTab({
  teamId,
  isAdmin,
  currentUserId,
  members,
}: {
  teamId: string;
  isAdmin: boolean;
  currentUserId: string;
  members: TeamMemberRow[];
}) {
  const [items, setItems] = useState<TeamMemberRow[]>(members);
  const [confirmRemove, setConfirmRemove] = useState<TeamMemberRow | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const onChangeRole = (id: string, role: TeamMemberRow["role"]) => {
    const prev = items;
    setItems((cur) => cur.map((m) => (m.id === id ? { ...m, role } : m)));
    startTransition(async () => {
      const r = await updateTeamMemberRoleAction({ memberId: id, role });
      if (!r.ok) {
        setItems(prev);
        toast.error("Couldn't change role", { description: r.error });
      }
    });
  };

  const doRemove = (m: TeamMemberRow) => {
    const prev = items;
    setItems((cur) => cur.filter((x) => x.id !== m.id));
    startTransition(async () => {
      const r = await removeTeamMemberAction({ memberId: m.id });
      if (!r.ok) {
        setItems(prev);
        toast.error("Couldn't remove", { description: r.error });
        return;
      }
      toast.info("Member removed");
    });
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {isAdmin && <InviteForm teamId={teamId} onInvited={() => undefined} />}

      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {items.map((m, i) => (
          <Row
            key={m.id}
            m={m}
            isLast={i === items.length - 1}
            isAdmin={isAdmin}
            isSelf={m.userId === currentUserId}
            disabled={pending}
            onChangeRole={(role) => onChangeRole(m.id, role)}
            onRemove={() => setConfirmRemove(m)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remove this member?"
        description={
          confirmRemove
            ? `${confirmRemove.fullName ?? confirmRemove.email} will lose access to this team's shared snippets immediately. This can be undone with a fresh invite.`
            : ""
        }
        confirmLabel="Yes, remove"
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => {
          if (confirmRemove) doRemove(confirmRemove);
          setConfirmRemove(null);
        }}
      />
    </div>
  );
}

function Row({
  m,
  isLast,
  isAdmin,
  isSelf,
  disabled,
  onChangeRole,
  onRemove,
}: {
  m: TeamMemberRow;
  isLast: boolean;
  isAdmin: boolean;
  isSelf: boolean;
  disabled: boolean;
  onChangeRole: (next: TeamMemberRow["role"]) => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{
        padding: "13px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--c-border)",
        display: "grid",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {m.fullName ?? m.email}
            {isSelf && (
              <span style={{ color: "var(--c-text-muted)", fontWeight: 400 }}>
                {" "}· you
              </span>
            )}
          </div>
          {m.fullName && (
            <div
              style={{
                fontSize: 11,
                color: "var(--c-text-muted)",
                marginTop: 2,
              }}
            >
              {m.email}
            </div>
          )}
          <div
            style={{
              fontSize: 11,
              color: "var(--c-text-muted)",
              marginTop: 4,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>
              {m.charsTyped.toLocaleString()} chars typed
            </span>
            <span>
              {m.recentSessionCount} session
              {m.recentSessionCount === 1 ? "" : "s"} (recent)
            </span>
            {m.joinedAt && <span>joined {formatDate(m.joinedAt)}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {m.status === "invited" ? (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.6,
                padding: "3px 7px",
                borderRadius: 4,
                textTransform: "uppercase",
                color: "var(--c-warning)",
                background:
                  "color-mix(in srgb, var(--c-warning) 14%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--c-warning) 32%, transparent)",
              }}
            >
              Invited
            </span>
          ) : isAdmin && !isSelf ? (
            <select
              value={m.role}
              onChange={(e) =>
                onChangeRole(e.target.value as TeamMemberRow["role"])
              }
              disabled={disabled}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                background: "var(--c-surface-b)",
                border: "1px solid var(--c-border)",
                color: "var(--c-text)",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
              }}
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          ) : (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.6,
                padding: "3px 7px",
                borderRadius: 4,
                textTransform: "uppercase",
                color: "var(--c-text-muted)",
                background: "var(--c-surface-b)",
                border: "1px solid var(--c-border)",
              }}
            >
              {m.role}
            </span>
          )}
          {isAdmin && !isSelf && (
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              style={dangerBtn(disabled)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InviteForm({
  teamId,
  onInvited,
}: {
  teamId: string;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [pending, startTransition] = useTransition();

  const onSubmit = () => {
    if (!email.trim()) return;
    startTransition(async () => {
      const r = await inviteTeamMemberAction({
        teamId,
        email: email.trim(),
        role,
      });
      if (!r.ok) {
        toast.error("Couldn't invite", { description: r.error });
        return;
      }
      setEmail("");
      toast.success("Invite sent", {
        description: "They'll get an email with the join link.",
      });
      onInvited();
    });
  };

  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 16,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13 }}>Invite a member</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teammate@company.com"
          disabled={pending}
          style={{
            flex: 1,
            minWidth: 200,
            background: "var(--c-surface-b)",
            border: "1px solid var(--c-border)",
            borderRadius: 7,
            padding: "9px 12px",
            color: "var(--c-text)",
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            outline: "none",
          }}
        />
        <select
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "admin" | "member" | "viewer")
          }
          disabled={pending}
          style={{
            padding: "9px 10px",
            borderRadius: 7,
            background: "var(--c-surface-b)",
            border: "1px solid var(--c-border)",
            color: "var(--c-text)",
            fontSize: 13,
            fontFamily: "var(--font-sans)",
          }}
        >
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || !email.trim()}
          style={primaryBtn(pending || !email.trim())}
        >
          {pending ? "Sending…" : "Send invite"}
        </button>
      </div>
    </div>
  );
}

// ─── Usage tab ───────────────────────────────────────────────────────────────

function UsageTab({ members }: { members: TeamMemberRow[] }) {
  const data = members
    .filter((m) => m.status === "active")
    .map((m) => ({
      name: (m.fullName ?? m.email).slice(0, 18),
      chars: m.charsTyped,
    }))
    .sort((a, b) => b.chars - a.chars);

  if (data.length === 0 || data.every((d) => d.chars === 0)) {
    return (
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          padding: 24,
          textAlign: "center",
          fontSize: 12,
          color: "var(--c-text-dim)",
        }}
      >
        No usage yet. Numbers will appear after team members run typing
        sessions.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
        Characters typed per member
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 14, bottom: 4, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
          <XAxis dataKey="name" stroke="var(--c-text-muted)" fontSize={11} />
          <YAxis stroke="var(--c-text-muted)" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--c-text)",
            }}
            cursor={{
              fill: "color-mix(in srgb, var(--c-primary) 8%, transparent)",
            }}
          />
          <Bar dataKey="chars" fill="var(--c-primary)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Audit tab ───────────────────────────────────────────────────────────────

function AuditTab({ sessions }: { sessions: SessionRow[] }) {
  if (sessions.length === 0) {
    return (
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          padding: 24,
          textAlign: "center",
          fontSize: 12,
          color: "var(--c-text-dim)",
        }}
      >
        No team typing sessions yet.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {sessions.map((s, i) => (
        <div
          key={s.id}
          style={{
            padding: "12px 16px",
            borderBottom:
              i === sessions.length - 1 ? "none" : "1px solid var(--c-border)",
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: 14,
            alignItems: "center",
            fontSize: 12,
          }}
        >
          <span style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{s.userDisplay}</div>
            <div
              style={{
                color: "var(--c-text-muted)",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              {s.targetApp ?? "—"}
            </div>
          </span>
          <span
            style={{
              color: "var(--c-text-dim)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
            }}
          >
            {s.charCount.toLocaleString()} chars
          </span>
          <span
            style={{
              color: "var(--c-primary)",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
            }}
          >
            {s.avgWpm} WPM
          </span>
          <span style={{ color: "var(--c-text-muted)", fontSize: 11 }}>
            {formatDate(s.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Confirm dialog (lightweight) ────────────────────────────────────────────

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 6000,
          background: "rgba(0,0,0,.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      />
      <div
        role="dialog"
        aria-modal
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 6001,
          width: "calc(100% - 40px)",
          maxWidth: 420,
          background: "var(--c-surface)",
          border:
            "1px solid color-mix(in srgb, var(--c-danger) 44%, transparent)",
          borderRadius: 12,
          padding: 22,
          color: "var(--c-text)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: "var(--c-text-dim)",
            lineHeight: 1.55,
            marginBottom: 18,
          }}
        >
          {description}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onCancel} style={ghostBtn(false)}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} style={dangerBtn(false)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Reusable bits ───────────────────────────────────────────────────────────

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
    padding: "9px 16px",
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
    padding: "7px 12px",
    borderRadius: 7,
    background: "color-mix(in srgb, var(--c-danger) 18%, transparent)",
    color: "var(--c-danger)",
    border: "1px solid color-mix(in srgb, var(--c-danger) 40%, transparent)",
    fontWeight: 600,
    fontSize: 11,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontFamily: "var(--font-sans)",
  };
}
