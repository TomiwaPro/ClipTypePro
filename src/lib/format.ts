/**
 * Deterministic, locale-free date formatting helpers.
 *
 * Why: the default `toLocaleDateString()` is locale-aware, so the SAME
 * timestamp renders differently on the Node server (often "en-US" or
 * platform default) vs the user's browser ("en-GB", "de-DE", whatever).
 * That mismatch crashes React hydration and *breaks event handlers* on
 * the affected subtree until React regenerates it client-side. We've
 * been bitten by this on the billing page.
 *
 * These helpers take an ISO string and produce identical output
 * everywhere by hard-coding month names and using UTC components.
 *
 * Tradeoff: a charge at 23:30 PT on May 6 is 06:30 UTC May 7. We
 * display "May 7, 2026" — slightly off from the user's wall-clock
 * day. For invoice / status displays this is acceptable; if a
 * specific feature ever needs exact local day, render only after
 * mount or pass the user's timezone explicitly.
 */

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "May 7, 2026" — used for invoice rows, log timelines. */
export function formatDate(iso: string | number | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** "May 7" — short form when year context is obvious. */
export function formatMonthDay(iso: string | number | Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
