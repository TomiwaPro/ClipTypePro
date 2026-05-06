"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

/**
 * Theme toggle button.
 *
 *   - default: fixed top-right (used by the auth-card layout)
 *   - inline:  flows in normal layout (used by the dashboard topbar)
 */
export function ThemeToggle({ inline = false }: { inline?: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: inline ? "static" : "fixed",
        top: inline ? "auto" : 16,
        right: inline ? "auto" : 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        background: "var(--c-surface-b)",
        border: "1px solid var(--c-border)",
        color: "var(--c-text-dim)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: inline ? "auto" : 50,
      }}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
