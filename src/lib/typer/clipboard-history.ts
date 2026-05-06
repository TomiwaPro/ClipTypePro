"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Local clipboard history.
 *
 * Stores the last 10 distinct items the user has pasted/loaded into the
 * typer. Uses localStorage so it survives reloads but never leaves the
 * device — clipboard content is sensitive and we promised users
 * zero-knowledge processing.
 *
 * Read via `useSyncExternalStore` so SSR + hydrate are consistent and
 * the React 19 hook compiler doesn't flag setState-in-effect.
 */

const STORAGE_KEY = "ctp_clipboard_history";
const MAX_ITEMS = 10;

export type HistoryItem = {
  id: string;
  text: string;
  preview: string;
  length: number;
  at: number;
};

function readStorage(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is HistoryItem =>
        typeof i?.id === "string" &&
        typeof i?.text === "string" &&
        typeof i?.length === "number" &&
        typeof i?.at === "number",
    );
  } catch {
    return [];
  }
}

function writeStorage(items: HistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch {
    /* localStorage may be blocked — silently degrade */
  }
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getServerSnapshot(): HistoryItem[] {
  return [];
}

/**
 * React hook returning current history + helpers.
 *
 *   add(text)     — push a new item to the top, dedupe by exact text,
 *                   trim to MAX_ITEMS. Whitespace-only / empty inputs
 *                   are ignored.
 *   remove(id)    — drop a single item by id
 *   clear()       — wipe the entire history
 */
export function useClipboardHistory() {
  // Read the current list. Each read snapshots from localStorage.
  const items = useSyncExternalStore(subscribe, readStorage, getServerSnapshot);

  const add = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    const current = readStorage();
    const dedup = current.filter((i) => i.text !== text);
    const next: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      preview: text.length > 60 ? `${text.slice(0, 57)}…` : text,
      length: text.length,
      at: Date.now(),
    };
    writeStorage([next, ...dedup].slice(0, MAX_ITEMS));
  }, []);

  const remove = useCallback((id: string) => {
    writeStorage(readStorage().filter((i) => i.id !== id));
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
  }, []);

  return { items, add, remove, clear };
}
