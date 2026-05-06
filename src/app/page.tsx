import Link from "next/link";
import { CookieBanner } from "@/components/cookie-banner";
import { FAQ } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { Nav } from "@/components/landing/nav";
import {
  FEATURES,
  FOOTER_LINKS,
  HOW_IT_WORKS,
  PRICING,
  STATS,
  TESTIMONIALS,
} from "@/lib/landing/content";

// Map pricing color names to CSS vars (typed-safe).
const COLOR_VAR: Record<string, string> = {
  textDim: "var(--c-text-dim)",
  primary: "var(--c-primary)",
  accent: "var(--c-accent)",
  warning: "var(--c-warning)",
};

export default function LandingPage() {
  return (
    <div
      style={{
        background: "var(--c-bg)",
        color: "var(--c-text)",
        fontFamily: "var(--font-sans)",
        minHeight: "100vh",
      }}
    >
      <Nav />
      <Hero />

      {/* SOCIAL PROOF BAR */}
      <div
        style={{
          borderTop: "1px solid var(--c-border)",
          borderBottom: "1px solid var(--c-border)",
          padding: "18px 40px",
          display: "flex",
          gap: 40,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {STATS.map(([v, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--c-primary)",
              }}
            >
              {v}
            </div>
            <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "80px 40px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            How it works
          </h2>
          <p style={{ color: "var(--c-text-dim)", fontSize: 14 }}>
            Three steps. Zero effort.
          </p>
        </div>
        <div
          className="landing-grid-3"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 24,
          }}
        >
          {HOW_IT_WORKS.map((s) => (
            <div
              key={s.n}
              className="hover-card"
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: 10,
                padding: 18,
                textAlign: "center",
                transition: "transform .2s, border-color .2s",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{s.icon}</div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--c-primary)",
                  marginBottom: 8,
                }}
              >
                {s.n}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--c-text-dim)", lineHeight: 1.6 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES (anchor target for nav "Features") */}
      <section
        id="features"
        style={{
          padding: "60px 40px",
          background: "var(--c-surface)",
          borderTop: "1px solid var(--c-border)",
          borderBottom: "1px solid var(--c-border)",
          scrollMarginTop: 80,
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Built for every scenario
            </h2>
            <p style={{ color: "var(--c-text-dim)", fontSize: 14 }}>
              From doctors to developers to streamers — ClipType Pro adapts to your world.
            </p>
          </div>
          <div
            className="landing-features-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 16,
            }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="hover-card"
                style={{
                  background: "var(--c-bg)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 10,
                  padding: 16,
                  transition: "all .2s",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--c-text-dim)", lineHeight: 1.55 }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORMS — anchor target for nav "Platforms" */}
      <section
        id="platforms"
        style={{
          padding: "60px 40px",
          maxWidth: 900,
          margin: "0 auto",
          scrollMarginTop: 80,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 26,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Smart platform detection
          </h2>
          <p style={{ color: "var(--c-text-dim)", fontSize: 14, maxWidth: 520, margin: "0 auto" }}>
            ClipType Pro rates 25+ platforms. Red-rated sites auto-trigger Stealth Mode. Proctoring software hard-blocks the engine.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
            maxWidth: 720,
            margin: "0 auto",
          }}
          className="landing-grid-3"
        >
          {(
            [
              { name: "Gmail", risk: "green", note: "Fully compatible" },
              { name: "Slack", risk: "green", note: "No restrictions" },
              { name: "Notion", risk: "green", note: "All blocks" },
              { name: "Epic EHR", risk: "yellow", note: "Compliance Mode" },
              { name: "Salesforce", risk: "yellow", note: "Use Stealth" },
              { name: "Twitter/X", risk: "red", note: "Bot detection" },
              { name: "LinkedIn", risk: "red", note: "Sophisticated monitoring" },
              { name: "Respondus LDB", risk: "red", note: "⛔ Auto-disabled" },
            ] as const
          ).map((p) => {
            const color =
              p.risk === "green"
                ? "var(--c-success)"
                : p.risk === "yellow"
                  ? "var(--c-warning)"
                  : "var(--c-danger)";
            return (
              <div
                key={p.name}
                style={{
                  background: "var(--c-surface)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--c-text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.note}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <span style={{ fontSize: 12, color: "var(--c-text-muted)" }}>
            Plus 17 more — full list inside the app.
          </span>
        </div>
      </section>

      {/* API — anchor target for nav "API" */}
      <section
        id="api"
        style={{
          padding: "60px 40px",
          background: "var(--c-surface)",
          borderTop: "1px solid var(--c-border)",
          borderBottom: "1px solid var(--c-border)",
          scrollMarginTop: 80,
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
            alignItems: "center",
          }}
          className="landing-grid-2"
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--c-primary)",
                marginBottom: 8,
                letterSpacing: 1,
              }}
            >
              FOR DEVELOPERS
            </div>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 26,
                fontWeight: 700,
                marginBottom: 12,
                lineHeight: 1.2,
              }}
            >
              Drop our typing engine into your product.
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "var(--c-text-dim)",
                lineHeight: 1.7,
                marginBottom: 16,
              }}
            >
              REST API with 10k calls/month on Pro, 1M on Enterprise. Per-key rate limits, audit logs, webhook events.
            </p>
            <a
              href="#pricing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 14px",
                borderRadius: 8,
                background: "var(--c-surface-b)",
                border: "1px solid var(--c-border)",
                color: "var(--c-text)",
                fontSize: 12,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              See API pricing →
            </a>
          </div>
          <div
            style={{
              background: "var(--c-bg)",
              border: "1px solid var(--c-border)",
              borderRadius: 10,
              padding: 16,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--c-success)",
              lineHeight: 1.7,
              overflowX: "auto",
            }}
          >
            <div style={{ color: "var(--c-text-muted)", marginBottom: 6 }}>
              {/* prettier-ignore */}
              {`// POST /v1/type`}
            </div>
            {`curl -X POST https://api.cliptypepro.com/v1/type \\
  -H "Authorization: Bearer ctp_live_…" \\
  -d '{"text":"Hello","mode":"human"}'`}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        style={{ padding: "80px 40px", maxWidth: 960, margin: "0 auto", scrollMarginTop: 80 }}
      >
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            Pricing
          </h2>
          <p style={{ color: "var(--c-text-dim)", fontSize: 14 }}>
            Start free. Scale when you&apos;re ready.
          </p>
        </div>
        <div
          className="landing-pricing-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 16,
          }}
        >
          {PRICING.map((p) => {
            const tierColor = COLOR_VAR[p.color];
            const ctaBg =
              p.variant === "primary"
                ? "var(--c-primary)"
                : p.variant === "accent"
                  ? "var(--c-accent)"
                  : "var(--c-surface-b)";
            const ctaColor =
              p.variant === "primary"
                ? "#000"
                : p.variant === "accent"
                  ? "#fff"
                  : "var(--c-text-dim)";

            // Outbound mailto opens in same tab; intra-app links via Link.
            const isExternal = p.href.startsWith("mailto:") || p.href.startsWith("http");
            const cta = (
              <a
                href={p.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  background: ctaBg,
                  color: ctaColor,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: 0.2,
                  textDecoration: "none",
                }}
              >
                {p.cta}
              </a>
            );

            return (
              <div
                key={p.name}
                style={{
                  background: p.popular
                    ? "color-mix(in srgb, var(--c-primary) 8%, var(--c-surface))"
                    : "var(--c-surface)",
                  border: `1px solid ${p.popular ? "var(--c-primary)" : "var(--c-border)"}`,
                  borderRadius: 10,
                  padding: 22,
                  position: "relative",
                }}
              >
                {p.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -11,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "var(--c-primary)",
                      color: "#000",
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1,
                      padding: "3px 10px",
                      borderRadius: 4,
                    }}
                  >
                    MOST POPULAR
                  </div>
                )}
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: tierColor,
                    marginBottom: 8,
                  }}
                >
                  {p.name}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "var(--c-text)",
                    }}
                  >
                    {p.price}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--c-text-muted)",
                      marginLeft: 3,
                    }}
                  >
                    {p.period}
                  </span>
                </div>
                <div style={{ display: "grid", gap: 7, marginBottom: 20 }}>
                  {p.features.map((f) => (
                    <div
                      key={f}
                      style={{
                        display: "flex",
                        gap: 7,
                        fontSize: 12,
                        color: "var(--c-text-dim)",
                      }}
                    >
                      <span style={{ color: tierColor, flexShrink: 0 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                {/* Plain anchor for mailto so nothing leaks through Next's Link */}
                {isExternal ? (
                  cta
                ) : (
                  <Link
                    href={p.href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      padding: 10,
                      borderRadius: 8,
                      background: ctaBg,
                      color: ctaColor,
                      fontWeight: 600,
                      fontSize: 11,
                      letterSpacing: 0.2,
                      textDecoration: "none",
                    }}
                  >
                    {p.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section
        style={{
          padding: "60px 40px",
          background: "var(--c-surface)",
          borderTop: "1px solid var(--c-border)",
          borderBottom: "1px solid var(--c-border)",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 24,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 40,
            }}
          >
            What people are saying
          </h2>
          <div
            className="landing-grid-3"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                style={{
                  background: "var(--c-bg)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 10,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    color: "var(--c-warning)",
                    fontSize: 13,
                    marginBottom: 10,
                  }}
                  aria-label={`${t.rating} out of 5 stars`}
                >
                  {"★".repeat(t.rating)}
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--c-text-dim)",
                    lineHeight: 1.65,
                    marginBottom: 14,
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQ />

      {/* CTA banner */}
      <section
        style={{
          padding: "70px 40px",
          textAlign: "center",
          background:
            "radial-gradient(ellipse at center, color-mix(in srgb, var(--c-primary) 12%, transparent) 0%, transparent 70%)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 14,
          }}
        >
          Ready to stop typing?
        </h2>
        <p
          style={{
            color: "var(--c-text-dim)",
            fontSize: 15,
            marginBottom: 30,
          }}
        >
          Join 12,400+ users who type smarter every day.
        </p>
        <Link
          href="/signup"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "14px 32px",
            borderRadius: 8,
            background: "var(--c-primary)",
            color: "#000",
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Start your free trial — no card needed →
        </Link>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: "1px solid var(--c-border)",
          padding: "36px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          <span style={{ color: "var(--c-primary)" }}>Clip</span>
          <span style={{ color: "var(--c-text)" }}>Type</span>
          <span style={{ color: "var(--c-accent)" }}>Pro</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          {FOOTER_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="nav-link"
              style={{
                fontSize: 12,
                color: "var(--c-text-muted)",
                textDecoration: "none",
                transition: "color .15s",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
          © 2026 ClipType Pro Ltd. All rights reserved.
        </div>
      </footer>

      <CookieBanner />

      {/* Responsive collapses for tablet/mobile */}
      <style>{`
        @media (max-width: 880px) {
          .landing-pricing-grid { grid-template-columns: 1fr 1fr !important; }
          .landing-features-grid { grid-template-columns: 1fr 1fr !important; }
          .landing-grid-2 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .landing-grid-3 { grid-template-columns: 1fr !important; }
          .landing-features-grid { grid-template-columns: 1fr !important; }
          .landing-pricing-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
