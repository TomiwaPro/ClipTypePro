"use client";

import { create } from "zustand";

/**
 * Global UI state shared across the dashboard shell.
 *
 *   - searchOpen   — global ⌘K palette
 *   - upgradeOpen  — Pro upgrade modal (pricing teaser)
 *   - upgradeReason — optional context (e.g. "team", "compliance") used to
 *                    tailor the headline; null means "generic upgrade"
 *   - sidebarOpen  — mobile drawer (desktop sidebar is always visible)
 *
 * The UI store is purposefully tiny — server-derived data (user, profile,
 * notifications) flows in through props/server components, not the store.
 */
type UIState = {
  searchOpen: boolean;
  upgradeOpen: boolean;
  upgradeReason: string | null;
  sidebarOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  openUpgrade: (reason?: string | null) => void;
  closeUpgrade: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  searchOpen: false,
  upgradeOpen: false,
  upgradeReason: null,
  sidebarOpen: false,
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  openUpgrade: (reason = null) => set({ upgradeOpen: true, upgradeReason: reason }),
  closeUpgrade: () => set({ upgradeOpen: false, upgradeReason: null }),
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
