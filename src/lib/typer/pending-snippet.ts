"use client";

/**
 * Tiny helper: cross-page handoff of a snippet's content from
 * /dashboard/snippets → /dashboard/typer.
 *
 * Why sessionStorage and not URL search params:
 *   - snippet content can be 10k chars; URLs aren't a good fit
 *   - URL params would also leak into history / share sheets
 *   - sessionStorage is per-tab, auto-cleared when the tab closes
 *
 * Why not zustand:
 *   - state would survive a full page reload of /dashboard/typer
 *     (sessionStorage does too) but zustand doesn't survive a hard
 *     navigation that re-mounts the provider tree
 *   - sessionStorage is read in a single useEffect-on-mount and
 *     immediately cleared, which is the simplest race-free pattern
 */

const KEY = "ctp_pending_snippet";

export function setPendingSnippet(text: string): void {
  if (!text) return;
  try {
    sessionStorage.setItem(KEY, text);
  } catch {
    /* private mode etc. — silently degrade; user can retry */
  }
}

/**
 * Read and clear in one call so accidental remounts don't double-load.
 * Returns null if there's nothing pending.
 */
export function consumePendingSnippet(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v) sessionStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
