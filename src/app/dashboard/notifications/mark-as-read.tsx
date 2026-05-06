"use client";

import { useEffect, useRef } from "react";
import { markAllNotificationsReadAction } from "./actions";

/**
 * Fires the mark-all-as-read server action exactly once on mount.
 *
 * `useRef` guards against React Strict Mode's double-invocation in dev so
 * we don't fire two redundant updates. The server action is idempotent
 * either way (the WHERE clause only matches unread rows).
 */
export function MarkAsReadOnMount() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void markAllNotificationsReadAction();
  }, []);

  return null;
}
