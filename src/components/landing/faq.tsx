"use client";

import { useState } from "react";
import { FAQS } from "@/lib/landing/content";

export function FAQ() {
  // null = all closed; otherwise the index of the currently-open question.
  // Clicking the open one collapses it; clicking another swaps without
  // ever showing two open at once.
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      style={{
        padding: "80px 40px",
        maxWidth: 680,
        margin: "0 auto",
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
                    transition: "transform .2s",
                    flexShrink: 0,
                    marginLeft: 14,
                  }}
                >
                  +
                </span>
              </button>

              {isOpen && (
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${i}`}
                  style={{
                    padding: "0 18px 15px",
                    fontSize: 13,
                    color: "var(--c-text-dim)",
                    lineHeight: 1.65,
                    borderTop: "1px solid var(--c-border)",
                  }}
                >
                  <div style={{ paddingTop: 12 }}>{f.a}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
