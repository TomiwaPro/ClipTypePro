"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DEMO = "ClipType Pro — copy it, we type it.";

export function Hero() {
  const [typed, setTyped] = useState("");

  // Typewriter effect — types DEMO one char at a time, then stops.
  // Cleared on unmount so navigating away doesn't leak intervals.
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      if (i <= DEMO.length) {
        setTyped(DEMO.slice(0, i));
        i++;
      } else {
        clearInterval(t);
      }
    }, 55);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      style={{
        padding: "100px 40px 80px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Soft glow behind the headline */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          background:
            "radial-gradient(ellipse, color-mix(in srgb, var(--c-primary) 12%, transparent) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.8,
            background: "color-mix(in srgb, var(--c-primary) 18%, transparent)",
            color: "var(--c-primary)",
            border: "1px solid color-mix(in srgb, var(--c-primary) 30%, transparent)",
            marginBottom: 20,
          }}
        >
          ✦ Now in public beta — free 14-day Pro trial
        </div>

        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(32px, 5vw, 58px)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 20,
            letterSpacing: -1,
          }}
        >
          Copy it.
          <br />
          <span
            style={{
              background: "var(--c-grad)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            We type it.
          </span>
        </h1>

        <p
          style={{
            fontSize: 17,
            color: "var(--c-text-dim)",
            maxWidth: 520,
            margin: "0 auto 36px",
            lineHeight: 1.65,
          }}
        >
          ClipType Pro monitors your clipboard and types your text character by
          character — anywhere, into any field, simulating perfect human keystrokes.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginBottom: 60,
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/signup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "13px 28px",
              borderRadius: 8,
              background: "var(--c-primary)",
              color: "#000",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Start free — no card needed →
          </Link>
          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "13px 28px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid color-mix(in srgb, var(--c-primary) 55%, transparent)",
              color: "var(--c-primary)",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        </div>

        {/* Demo terminal */}
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 24px 80px rgba(0,0,0,.5)",
          }}
        >
          <div
            style={{
              background: "var(--c-surface-b)",
              padding: "10px 16px",
              display: "flex",
              gap: 6,
              alignItems: "center",
              borderBottom: "1px solid var(--c-border)",
            }}
          >
            {["#FF4557", "#FFB800", "#00D97E"].map((c, i) => (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  background: c,
                }}
              />
            ))}
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                color: "var(--c-text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              cliptypepro — live demo
            </span>
          </div>
          <div style={{ padding: "22px 24px", textAlign: "left" }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--c-text-muted)",
                marginBottom: 8,
                fontFamily: "var(--font-mono)",
              }}
            >
              {/* prettier-ignore */}
              {`// Typing from clipboard…`}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--c-success)",
                lineHeight: 1.6,
                minHeight: 24,
              }}
            >
              {typed}
              <span style={{ animation: "blink 1s infinite", display: "inline" }}>
                ▋
              </span>
            </div>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 16,
              }}
            >
              {[
                ["WPM", "94"],
                ["Mode", "Human"],
                ["Progress", "100%"],
              ].map(([l, v]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 16,
                      color: "var(--c-primary)",
                      fontWeight: 700,
                    }}
                  >
                    {v}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--c-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
