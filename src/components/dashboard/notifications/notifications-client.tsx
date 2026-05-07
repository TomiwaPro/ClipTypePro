"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/dashboard/notifications/actions";

export type Notification = {
  id: string;
  type: "alert" | "billing" | "system" | "team";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const TYPE_LABEL: Record<Notification["type"], string> = {
  alert: "Alert",
  billing: "Billing",
  system: "System",
  team: "Team",
};

type Filter = "all" | "unread";

export function NotificationsClient({
  initial,
}: {
  initial: Notification[];
}) {
  // Optimistic local copy so a click marks the row read instantly.
  // The server action revalidates the layout afterwards; on the next
  // navigation the sidebar badge reflects the persisted state.
  const [items, setItems] = useState<Notification[]>(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, startTransition] = useTransition();

  const unreadCount = items.filter((n) => !n.read).length;
  const visible = filter === "unread" ? items.filter((n) => !n.read) : items;

  const onClickRow = (n: Notification) => {
    if (n.read) return;
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
    );
    startTransition(async () => {
      const result = await markNotificationReadAction(n.id);
      if (!result.ok) {
        // Rollback on server error
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)),
        );
        toast.error("Couldn't mark as read", { description: result.error });
      }
    });
  };

  const onMarkAll = () => {
    if (unreadCount === 0) return;
    const snapshot = items;
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (!result.ok) {
        setItems(snapshot);
        toast.error("Couldn't mark all as read", { description: result.error });
        return;
      }
      toast.success("All caught up");
    });
  };

  return (
    <div className="fade-up" style={{ display: "grid", gap: 14, maxWidth: 720 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 19,
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Notifications
          </h1>
          <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You're all caught up"}
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
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={pillBtn(filter === f)}
            >
              {f === "all"
                ? `All · ${items.length}`
                : `Unread · ${unreadCount}`}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onMarkAll}
          disabled={pending || unreadCount === 0}
          style={{
            padding: "8px 14px",
            borderRadius: 7,
            background: "var(--c-surface-b)",
            color: "var(--c-text)",
            border: "1px solid var(--c-border)",
            fontWeight: 600,
            fontSize: 12,
            cursor:
              pending || unreadCount === 0 ? "not-allowed" : "pointer",
            opacity: pending || unreadCount === 0 ? 0.5 : 1,
            fontFamily: "var(--font-sans)",
          }}
        >
          Mark all read
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {visible.map((n, i) => (
            <Row
              key={n.id}
              n={n}
              onClick={() => onClickRow(n)}
              isLast={i === visible.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  n,
  onClick,
  isLast,
}: {
  n: Notification;
  onClick: () => void;
  isLast: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover-row"
      style={{
        width: "100%",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 14,
        alignItems: "flex-start",
        padding: "14px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--c-border)",
        background: n.read
          ? "transparent"
          : "color-mix(in srgb, var(--c-primary) 4%, transparent)",
        border: "none",
        borderLeft: n.read
          ? "3px solid transparent"
          : "3px solid var(--c-primary)",
        color: "var(--c-text)",
        cursor: n.read ? "default" : "pointer",
        textAlign: "left",
        fontFamily: "var(--font-sans)",
      }}
    >
      <TypePill type={n.type} />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: n.read ? 500 : 700,
            marginBottom: 2,
          }}
        >
          {n.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--c-text-dim)",
            lineHeight: 1.55,
          }}
        >
          {n.message}
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--c-text-muted)",
          whiteSpace: "nowrap",
          paddingTop: 2,
        }}
      >
        {formatDate(n.createdAt)}
      </div>
    </button>
  );
}

function TypePill({ type }: { type: Notification["type"] }) {
  const color =
    type === "billing"
      ? "var(--c-warning)"
      : type === "alert"
        ? "var(--c-danger)"
        : type === "team"
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
        marginTop: 2,
      }}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 32,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 26, marginBottom: 10 }}>🌱</div>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
        {filter === "unread" ? "Nothing unread" : "No notifications yet"}
      </div>
      <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
        {filter === "unread"
          ? "You're all caught up. Anything new will land here."
          : "Billing events, security alerts, and team updates will appear here."}
      </div>
    </div>
  );
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
