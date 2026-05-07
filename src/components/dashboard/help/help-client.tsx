"use client";

import { useMemo, useState } from "react";

type Faq = {
  q: string;
  a: string;
  category: "getting-started" | "speed" | "snippets" | "billing" | "privacy" | "detection";
};

const FAQS: Faq[] = [
  {
    category: "detection",
    q: "Will I get banned for using ClipType Pro?",
    a: "ClipType Pro is built to mimic human typing — variable cadence, occasional typos that auto-correct, natural pauses. Most platforms can't distinguish it from a real keyboard. That said, every platform has its own detection model. Use the Platform Risk page to check before typing on a high-risk site, and pick a slower speed mode (Stealth or Human) for anything sensitive.",
  },
  {
    category: "speed",
    q: "What's the difference between speed modes?",
    a: "Stealth is the slowest and most human (~30 WPM with realistic pauses). Human is the default (~60 WPM). Balanced is faster (~100 WPM). Fast skips most pauses (~150 WPM). Instant pastes everything in one go — fastest but the most detectable. Pick based on the platform's risk rating.",
  },
  {
    category: "speed",
    q: "How do I switch speed modes?",
    a: "Open the Typer page, use the speed selector at the top of the typing panel, or set a default in Settings → Typing Behaviour. The default applies to every new session until you change it.",
  },
  {
    category: "snippets",
    q: "How do I create and use snippets?",
    a: "Go to /dashboard/snippets and click \"New snippet\". Give it a title, paste your content, pick a category. To use a snippet, open the Typer and select it from the dropdown — ClipType Pro types it out at your chosen speed.",
  },
  {
    category: "snippets",
    q: "Can I share snippets with my team?",
    a: "Yes, on the Teams plan. Mark a snippet as shared from the snippets page and pick the team. Anyone in that team can use it. Private snippets stay private to you.",
  },
  {
    category: "snippets",
    q: "How do I export my snippets?",
    a: "Settings → Privacy & Data → Export my data. You'll download a JSON file with every snippet, every typing session, and your profile data. Run this any time.",
  },
  {
    category: "billing",
    q: "How do I cancel my subscription?",
    a: "Billing page → Cancel subscription. You keep Pro until the end of the current period, then drop to Free. You can resume any time before the end date by clicking Resume in the Stripe portal — or cancel and apply a coupon to re-subscribe in one step.",
  },
  {
    category: "billing",
    q: "What happens after my 14-day free trial ends?",
    a: "Stripe charges the card on file and the trial converts to a paid subscription. If you cancel before the trial ends, no charge is made and you drop to the Free plan automatically.",
  },
  {
    category: "billing",
    q: "Where do I update my payment method?",
    a: "Billing page → Manage payment method. Opens the Stripe Customer Portal where you can update the card, download invoices, or change plan.",
  },
  {
    category: "billing",
    q: "Do you offer refunds?",
    a: "First 14 days, yes — we'll refund any charge in the first two weeks, no questions. After that, refunds are case-by-case. Email support@cliptypepro.com.",
  },
  {
    category: "privacy",
    q: "Is my typing data private?",
    a: "Yes. Your snippets, sessions, and stats are stored against your account only. We never sell or share them. Service-role database access is restricted to webhooks and admin reconciliation; everything user-facing goes through row-level security scoped to your auth.uid().",
  },
  {
    category: "privacy",
    q: "Do you log the actual content I type?",
    a: "We log session metadata: char count, word count, speed mode, target app, duration. We do NOT log the literal text you type. Snippets you save are stored verbatim because that's the whole point of saving them — but free-typing through the Typer is not retained.",
  },
  {
    category: "privacy",
    q: "How do I delete my account?",
    a: "Settings → Privacy & Data → Delete account. We cancel any active subscription, delete your data from every table, then delete the auth user itself. Irreversible. Export first if you want a copy.",
  },
  {
    category: "getting-started",
    q: "Where do I start?",
    a: "Go to /dashboard/typer, paste some text into the Typer, and click Start. ClipType Pro will simulate keystrokes into the focused input. Try it on a scratch document first to see how speed modes feel.",
  },
  {
    category: "getting-started",
    q: "Why isn't text appearing in my target app?",
    a: "Click the input you want to type into to give it focus before pressing Start. ClipType Pro simulates keystrokes into whatever has focus — if focus is on the Typer itself, the text goes there. The Pause On Focus Loss toggle in Settings auto-pauses if you click away mid-session.",
  },
];

const CATEGORY_LABEL: Record<Faq["category"], string> = {
  "getting-started": "Getting started",
  speed: "Speed modes",
  snippets: "Snippets",
  billing: "Billing",
  privacy: "Privacy & data",
  detection: "Detection & safety",
};

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: "⌘K", action: "Open global search" },
  { keys: "/", action: "Focus the search field on the current page" },
  { keys: "Esc", action: "Close modals or dismiss the search palette" },
  { keys: "⌘ + Enter", action: "Start a typing session in the Typer" },
  { keys: "Space", action: "Pause / resume a typing session" },
  { keys: "⌘ + S", action: "Save a snippet from the Typer panel" },
];

export function HelpClient() {
  const [query, setQuery] = useState("");
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQS;
    return FAQS.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        CATEGORY_LABEL[f.category].toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="fade-up" style={{ display: "grid", gap: 18, maxWidth: 760 }}>
      <div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Help &amp; Documentation
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          Search the FAQ, browse keyboard shortcuts, or reach the team.
        </p>
      </div>

      {/* Support panel */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <SupportCard
          title="Live chat"
          desc="Working hours, Mon–Fri."
          actionLabel="Open chat"
          comingSoon
        />
        <SupportCard
          title="Email support"
          desc="Reply within 1 business day."
          actionLabel="support@cliptypepro.com"
          href="mailto:support@cliptypepro.com"
        />
      </div>

      {/* FAQ search */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
          Frequently asked questions
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpenIdx(null);
          }}
          placeholder="Search the FAQ…"
          style={{
            width: "100%",
            background: "var(--c-surface-b)",
            border: "1px solid var(--c-border)",
            borderRadius: 7,
            padding: "9px 12px",
            color: "var(--c-text)",
            fontSize: 13,
            fontFamily: "var(--font-sans)",
            outline: "none",
            marginBottom: 10,
          }}
        />

        {filtered.length === 0 ? (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              padding: 24,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>🔎</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              No matches for &ldquo;{query}&rdquo;
            </div>
            <div style={{ fontSize: 12, color: "var(--c-text-dim)" }}>
              Try a different keyword, or email support@cliptypepro.com.
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {filtered.map((f, i) => {
              const isOpen = openIdx === i;
              return (
                <div
                  key={`${f.category}-${i}`}
                  style={{
                    borderBottom:
                      i === filtered.length - 1
                        ? "none"
                        : "1px solid var(--c-border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "13px 16px",
                      background: "transparent",
                      border: "none",
                      color: "var(--c-text)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.q}</div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--c-text-muted)",
                          marginTop: 2,
                          textTransform: "uppercase",
                          letterSpacing: 0.6,
                        }}
                      >
                        {CATEGORY_LABEL[f.category]}
                      </div>
                    </div>
                    <span
                      aria-hidden
                      style={{
                        color: "var(--c-text-muted)",
                        fontSize: 12,
                        transform: isOpen ? "rotate(90deg)" : "none",
                        transition: "transform .15s",
                        flexShrink: 0,
                      }}
                    >
                      ›
                    </span>
                  </button>
                  <div
                    style={{
                      maxHeight: isOpen ? 400 : 0,
                      overflow: "hidden",
                      transition: "max-height .25s ease",
                    }}
                  >
                    <div
                      style={{
                        padding: "0 16px 14px 16px",
                        fontSize: 12,
                        color: "var(--c-text-dim)",
                        lineHeight: 1.65,
                      }}
                    >
                      {f.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts */}
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
          Keyboard shortcuts
        </div>
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          {SHORTCUTS.map((s, i) => (
            <div
              key={s.keys}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "11px 16px",
                borderBottom:
                  i === SHORTCUTS.length - 1
                    ? "none"
                    : "1px solid var(--c-border)",
                fontSize: 12,
              }}
            >
              <kbd
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  background: "var(--c-surface-b)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 5,
                  padding: "3px 8px",
                  color: "var(--c-text)",
                  minWidth: 84,
                  textAlign: "center",
                }}
              >
                {s.keys}
              </kbd>
              <span style={{ color: "var(--c-text-dim)" }}>{s.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SupportCard({
  title,
  desc,
  actionLabel,
  href,
  comingSoon,
}: {
  title: string;
  desc: string;
  actionLabel: string;
  href?: string;
  comingSoon?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 16,
        display: "grid",
        gap: 6,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 11, color: "var(--c-text-dim)" }}>{desc}</div>
      {comingSoon ? (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "var(--c-text-muted)",
            fontFamily: "var(--font-mono)",
          }}
          title="Live chat widget wires up later in this branch"
        >
          Coming soon
        </div>
      ) : (
        <a
          href={href}
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "var(--c-primary)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {actionLabel} →
        </a>
      )}
    </div>
  );
}
