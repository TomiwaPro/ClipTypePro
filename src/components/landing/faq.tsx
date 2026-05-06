"use client";

import { useState } from "react";
import { FAQS } from "@/lib/landing/content";

/**
 * FAQ accordion. Only one item open at a time (state is `number | null`,
 * not a Set, so swapping never shows two open). Animated with a CSS grid
 * trick: the panel container animates `grid-template-rows` from 0fr → 1fr,
 * which gives a smooth height transition without measuring DOM.
 */
export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      style={{
        padding: "80px 40px",
        maxWidth: 680,
        margin: "0 auto",
        scrollMarginTop: 80,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 24,
          fontWeight: 700,
          textAlign: "center",
          marginBottom: 40,
        }}
      >
        Frequently asked
      </h2>

      <div style={{ display: "grid", gap: 8 }}>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              style={{
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                id={`faq-trigger-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  width: "100%",
                  padding: "15px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "transparent",
                  border: "none",
                  color: "var(--c-text)",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>{f.q}</span>
                <span
                  aria-hidden="true"
                  style={{
                    color: "var(--c-primary)",
                    fontSize: 16,
                    transform: isOpen ? "rotate(45deg)" : "none",
                    transition: "transform .25s ease",
                    flexShrink: 0,
                    marginLeft: 14,
                  }}
                >
                  +
                </span>
              </button>

              {/*
                Animated reveal: outer grid track animates from 0fr → 1fr.
                Inner div has min-height: 0 to allow the grid track to
                actually collapse to zero — without that the content
                overflows even when track height is 0.
              */}
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-trigger-${i}`}
                style={{
                  display: "grid",
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  transition: "grid-template-rows .25s ease",
                }}
              >
                <div style={{ minHeight: 0, overflow: "hidden" }}>
                  <div
                    style={{
                      padding: "12px 18px 15px",
                      fontSize: 13,
                      color: "var(--c-text-dim)",
                      lineHeight: 1.65,
                      borderTop: "1px solid var(--c-border)",
                    }}
                  >
                    {f.a}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
