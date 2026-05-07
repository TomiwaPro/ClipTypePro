"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/components/theme-provider";
import { updateThemePreferenceAction } from "@/app/dashboard/settings/actions";

/**
 * Glue between profile.theme_preference (DB) and the localStorage-backed
 * ThemeProvider, mounted from the dashboard layout so it runs on every
 * authenticated page.
 *
 * Two responsibilities:
 *
 *   1. First-mount adoption — if localStorage has no theme yet (the user
 *      is on a brand-new device or just cleared storage), adopt the
 *      preference saved on their profile.
 *
 *   2. Cross-device sync — when the theme changes (topbar toggle,
 *      settings page, ⌘ shortcut), persist the new value to the profile.
 *      The first render is a no-op via a ref, so we don't pointlessly
 *      write the value that's already in the DB.
 */
export function ThemeSeed({
  serverTheme,
}: {
  serverTheme: "dark" | "light";
}) {
  const { theme, setTheme } = useTheme();
  const firstRender = useRef(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ctp_theme");
      if (stored !== "dark" && stored !== "light") {
        setTheme(serverTheme);
      }
    } catch {
      /* localStorage blocked — nothing to sync */
    }
    // Intentional empty deps: this runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    void updateThemePreferenceAction({ theme });
  }, [theme]);

  return null;
}
