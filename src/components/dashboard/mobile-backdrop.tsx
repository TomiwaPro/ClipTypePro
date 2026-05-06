"use client";

import { useUIStore } from "./ui-store";

/**
 * Translucent backdrop behind the mobile sidebar drawer. Click to close.
 * Hidden by media query on desktop where the sidebar is always in the
 * layout flow.
 */
export function MobileBackdrop() {
  const open = useUIStore((s) => s.sidebarOpen);
  const close = useUIStore((s) => s.closeSidebar);

  return (
    <>
      <div
        aria-hidden="true"
        onClick={close}
        className="dashboard-mobile-backdrop"
        data-open={open ? "true" : "false"}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity .2s ease",
          display: "none",
        }}
      />
      <style>{`
        @media (max-width: 720px) {
          .dashboard-mobile-backdrop {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
