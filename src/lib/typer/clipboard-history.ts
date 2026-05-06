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
 * Reads via `useSyncExternalStore`, which has one critical contract:
 * `getSnapshot` MUST return the same reference when the underlying data
 * hasn't changed. Returning a fresh `JSON.parse` result every call
 * triggers an "infinite getSnapshot loop" in React 18/19. We satisfy it
 * with a tiny module-level cache: the raw localStorage string is the
 * cache key; only when it changes do we re-parse and produce a new
 * array reference.
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

// ─── Module-level cache (per-tab, not per-component) ──────────────────────────
let cachedRaw: string | null = null;
let cachedParsed: HistoryItem[] = EMPTY_LIST();

function EMPTY_LIST(): HistoryItem[] {
  // Single shared empty array reference so getSnapshot returns the same
  // value whenever storage is empty/blocked/missing.
  return [];
}

function parseList(raw: string): HistoryItem[] {
  if (!raw) return EMPTY_LIST();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_LIST();
    return parsed.filter(
      (i): i is HistoryItem =>
        typeof i?.id === "string" &&
        typeof i?.text === "string" &&
        typeof i?.length === "number" &&
        typeof i?.at === "number",
    );
  } catch {
    return EMPTY_LIST();
  }
}

function readStorage(): HistoryItem[] {
  let raw = "";
  try {
    raw = localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    raw = "";
  }
  if (raw === cachedRaw) return cachedParsed;
  cachedRaw = raw;
  cachedParsed = parseList(raw);
  return cachedParsed;
}

function writeStorage(items: HistoryItem[]): void {
  try {
    const serialized = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, serialized);
    // Keep the cache in sync immediately so the next readStorage doesn't
    // bounce on its own write.
    cachedRaw = serialized;
    cachedParsed = items;
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

const SERVER_SNAPSHOT: HistoryItem[] = EMPTY_LIST();
function getServerSnapshot(): HistoryItem[] {
  return SERVER_SNAPSHOT;
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
