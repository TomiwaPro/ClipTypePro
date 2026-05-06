"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

/**
 * Compact theme toggle for the auth pages — gives the tester (and anyone
 * who lands on /login from a dark/light email link) a way to flip themes.
 * Renders nothing during SSR snapshot to avoid hydration mismatch on the
 * icon swap.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        color: "var(--c-text-dim)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 50,
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
