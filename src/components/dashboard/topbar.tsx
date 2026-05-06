"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CreditCard, LogOut, Menu, Settings, User } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/lib/auth/actions";
import { useUIStore } from "./ui-store";

/**
 * Authenticated dashboard topbar.
 *
 * - Mobile-only hamburger that opens the sidebar drawer
 * - Avatar with user initials (no upload UI yet — Step 6+)
 * - Dropdown: Profile / Billing / Settings / Sign out
 *
 * The theme toggle has moved to the sidebar footer (per the Step 5
 * verification spec). Avatar/name flow in via server-layout props so
 * we don't fetch profile data twice per page.
 */
export function Topbar({
  fullName,
  email,
  avatarUrl,
  tier,
}: {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  tier: "free" | "pro" | "teams" | "enterprise";
}) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const display = fullName?.trim() || email.split("@")[0];
  const initials = display
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <header
      style={{
        height: 56,
        flexShrink: 0,
        background: "var(--c-surface)",
        borderBottom: "1px solid var(--c-border)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      {/* Mobile hamburger — hidden on desktop (sidebar always visible there) */}
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={toggleSidebar}
        className="dashboard-hamburger"
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "var(--c-surface-b)",
          border: "1px solid var(--c-border)",
          color: "var(--c-text)",
          display: "none",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Menu size={16} />
      </button>

      {/* Spacer pushes avatar to the right when hamburger is hidden */}
      <div style={{ flex: 1 }} />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label="Open user menu"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "5px 10px 5px 5px",
              borderRadius: 999,
              background: "var(--c-surface-b)",
              border: "1px solid var(--c-border)",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              color: "var(--c-text)",
            }}
          >
            <Avatar initials={initials} avatarUrl={avatarUrl} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                maxWidth: 140,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {display}
            </span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            style={{
              minWidth: 220,
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              padding: 6,
              boxShadow: "0 16px 48px rgba(0,0,0,.4)",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                borderBottom: "1px solid var(--c-border)",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 2,
                }}
              >
                {display}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--c-text-dim)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {email}
              </div>
              <div
                style={{
                  marginTop: 6,
                  display: "inline-flex",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.6,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background:
                    tier === "free"
                      ? "var(--c-surface-b)"
                      : "color-mix(in srgb, var(--c-primary) 15%, transparent)",
                  color: tier === "free" ? "var(--c-text-muted)" : "var(--c-primary)",
                  border: `1px solid ${tier === "free" ? "var(--c-border)" : "color-mix(in srgb, var(--c-primary) 30%, transparent)"}`,
                }}
              >
                {tier.toUpperCase()}
              </div>
            </div>

            <MenuItem href="/dashboard/profile" icon={<User size={14} />} label="Profile" />
            <MenuItem href="/dashboard/billing" icon={<CreditCard size={14} />} label="Billing" />
            <MenuItem href="/dashboard/settings" icon={<Settings size={14} />} label="Settings" />

            <DropdownMenu.Separator
              style={{
                height: 1,
                background: "var(--c-border)",
                margin: "4px 0",
              }}
            />

            <DropdownMenu.Item asChild>
              <form action={signOutAction}>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderRadius: 6,
                    background: "transparent",
                    border: "none",
                    color: "var(--c-danger)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    textAlign: "left",
                  }}
                  className="dashboard-menu-signout"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </form>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <style>{`
        .dashboard-menu-signout:hover {
          background: color-mix(in srgb, var(--c-danger) 12%, transparent) !important;
        }
        .dashboard-menu-item:hover {
          background: color-mix(in srgb, var(--c-primary) 8%, transparent);
          color: var(--c-text);
        }
        @media (max-width: 720px) {
          .dashboard-hamburger {
            display: inline-flex !important;
          }
        }
      `}</style>
    </header>
  );
}

function MenuItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className="dashboard-menu-item"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "8px 10px",
          borderRadius: 6,
          color: "var(--c-text-dim)",
          fontSize: 12,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        {icon}
        {label}
      </Link>
    </DropdownMenu.Item>
  );
}

function Avatar({
  initials,
  avatarUrl,
}: {
  initials: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // Avatar URLs come from arbitrary OAuth providers (Google, etc.) so
      // we can't realistically configure all of them as next/image domains.
      // A 28×28 avatar is a non-LCP element; the warning is moot here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        width={28}
        height={28}
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        background: "var(--c-grad)",
        color: "#000",
        fontSize: 11,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

