/**
 * Single source of truth for the dashboard sidebar.
 *
 * Each item has a slug → URL `/dashboard/<slug>`, an icon glyph (from the v4
 * prototype, kept as plain unicode so we don't pull in a heavy icon set for
 * every menu pixel), and an optional Pro flag. Pro-locked items render with
 * a lock and route to the upgrade modal for free users.
 */
export type NavItem = {
  /** URL slug under /dashboard/<slug>. */
  slug: string;
  label: string;
  /** Plain unicode glyph (matches v4). */
  icon: string;
  /** Pro+ only — free users see a lock and get the upgrade modal. */
  pro?: boolean;
  /** When true, render in a divider group at the bottom. */
  bottom?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { slug: "typer",         label: "Typer",         icon: "⌨" },
  { slug: "snippets",      label: "Snippets",      icon: "◫" },
  { slug: "platforms",     label: "Platforms",     icon: "◈" },
  { slug: "analytics",     label: "Analytics",     icon: "↗" },
  { slug: "team",          label: "Team",          icon: "⊕", pro: true },
  { slug: "compliance",    label: "Compliance",    icon: "🔐", pro: true },
  { slug: "marketplace",   label: "Marketplace",   icon: "⊞" },
  { slug: "referrals",     label: "Referral",      icon: "🎁" },
  { slug: "billing",       label: "Billing",       icon: "◆" },
  { slug: "api",           label: "API",           icon: "⚡", pro: true },
  { slug: "notifications", label: "Notifications", icon: "◎" },
  { slug: "help",          label: "Help",          icon: "?" },
  { slug: "settings",      label: "Settings",      icon: "◉" },
];

export function isProSlug(slug: string): boolean {
  return NAV_ITEMS.some((n) => n.slug === slug && n.pro === true);
}
