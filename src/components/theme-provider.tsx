"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "ctp_theme";
const DEFAULT: Theme = "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * External store: window.localStorage. Reads as the source of truth.
 * useSyncExternalStore is hydration-safe — SSR/initial render uses the
 * server snapshot, so we never setState inside an effect.
 */
function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function getSnapshot(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function getServerSnapshot(): Theme {
  return DEFAULT;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Reflect onto <html data-theme="..."> so global CSS variables flip.
  // No setState here — pure DOM side-effect.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
      // Manually fire a storage event for same-tab listeners.
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, [setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
