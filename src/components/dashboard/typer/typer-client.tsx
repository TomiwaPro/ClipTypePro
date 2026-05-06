"use client";

import { Lock } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { saveTypingSessionAction } from "@/lib/typer/actions";
import { useClipboardHistory } from "@/lib/typer/clipboard-history";
import { consumePendingSnippet } from "@/lib/typer/pending-snippet";
import {
  FREE_CHAR_LIMIT,
  randomDelay,
  SPEED_ORDER,
  SPEED_PRESETS,
  type SpeedKey,
} from "@/lib/typer/presets";
import { useUIStore } from "@/components/dashboard/ui-store";
import { PlatformWarningModal } from "./platform-warning-modal";

type Status =
  | { kind: "idle" }
  | { kind: "countdown"; secondsLeft: number }
  | { kind: "typing" }
  | { kind: "paused" }
  | { kind: "complete" }
  | { kind: "stopped" };

type Tier = "free" | "pro" | "teams" | "enterprise";

type Platform = {
  name: string;
  category: string;
  riskLevel: "green" | "yellow" | "red";
};

const COUNTDOWN_SECONDS = 3;
const TARGET_NONE = "__none__";

/**
 * Core typing engine — character-by-character output simulating human keystrokes.
 *
 * State machine:
 *   idle      — ready, no run in progress
 *   countdown — pre-roll seconds before typing starts
 *   typing    — emitting chars on a self-rescheduling timer
 *   paused    — user pressed pause OR window lost focus (Window Lock)
 *   complete  — finished naturally; session row written; export available
 *   stopped   — user aborted; nothing saved
 *
 * Refs (not state) hold the values the typing tick reads on every step
 * so changing speed/human-mode/typo settings mid-run is reflected on the
 * very next tick — without forcing a re-render of the entire engine.
 */
export function TyperClient({
  tier,
  platforms,
}: {
  tier: Tier;
  platforms: Platform[];
}) {
  const isFree = tier === "free";
  const openUpgrade = useUIStore((s) => s.openUpgrade);

  // ─── Source / output / status ────────────────────────────────────────
  const [clipText, setClipText] = useState("");
  const [typedText, setTypedText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // ─── Settings (persist across runs) ──────────────────────────────────
  const [speed, setSpeed] = useState<SpeedKey>("human");
  const [humanMode, setHumanMode] = useState(true);
  const [windowLock, setWindowLock] = useState(false);
  const [targetPlatform, setTargetPlatform] = useState<string>(TARGET_NONE);

  // Live metrics
  const [progress, setProgress] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [charsTyped, setCharsTyped] = useState(0);

  // Platform-warning modal
  const [warningOpen, setWarningOpen] = useState(false);

  // History (localStorage)
  const { items: history, add: addToHistory, remove: removeHistory, clear: clearHistory } =
    useClipboardHistory();

  // ─── Refs that the tick function reads each step ─────────────────────
  // Putting these in refs (not state) means changing speed mid-run picks
  // up on the very next character without remounting the timer.
  const clipRef = useRef(clipText);
  const speedRef = useRef(speed);
  const humanRef = useRef(humanMode);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    clipRef.current = clipText;
  }, [clipText]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    humanRef.current = humanMode;
  }, [humanMode]);

  // ─── "Load & Type" handoff from /dashboard/snippets ──────────────────
  // The snippets page writes the chosen content to sessionStorage just
  // before navigating here. We consume it once on mount (consumePending
  // also clears storage so a remount can't double-load).
  //
  // The setState-in-effect lint rule is suppressed below: the value
  // genuinely lives outside React (sessionStorage), can't be read
  // during SSR, and applies exactly once. Lazy initial state can't be
  // used because the initializer would run during server render too.
  useEffect(() => {
    const pending = consumePendingSnippet();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pending) setClipText(pending);
  }, []);

  // ─── Cleanup on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // ─── Window Lock (Pro): pause when tab/window loses focus ────────────
  // Status is read via setState's previous-value callback so we always
  // see the freshest value without needing a status mirror ref.
  useEffect(() => {
    if (!windowLock) return;

    const onBlur = () => {
      setStatus((prev) => {
        if (prev.kind === "typing") {
          pausedRef.current = true;
          if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
          return { kind: "paused" };
        }
        return prev;
      });
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [windowLock]);

  // ─── Helpers ─────────────────────────────────────────────────────────
  /**
   * Hard reset: clears output, progress, WPM, character count, all the
   * refs the engine reads, and any in-flight timer/interval. Also flips
   * status back to "idle" — without this, editing the source mid-run
   * would leave a stranded "typing" status with no actual ticks
   * scheduled (UI lies, looks broken).
   *
   * Pause the run first so the recursive tick (if it manages to fire
   * one more time before its timer is cleared) sees pausedRef=true and
   * exits without setting state.
   */
  const resetMetrics = useCallback(() => {
    pausedRef.current = true;
    setTypedText("");
    setProgress(0);
    setWpm(0);
    setCharsTyped(0);
    indexRef.current = 0;
    startTimeRef.current = null;
    if (tickTimerRef.current) {
      clearTimeout(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setStatus({ kind: "idle" });
  }, []);

  /**
   * Persist a session (complete OR stopped early) to typing_sessions.
   *
   * Saves both kinds — analytics wants partial runs counted too. If the
   * server action fails, surface a toast (the user keeps the on-screen
   * output and can re-export). One naive retry on transient failure;
   * still failing → toast with the actual error so the user knows.
   */
  const finalizeAndSave = useCallback(
    async (kind: "complete" | "stopped") => {
      const text = clipRef.current;
      const charsActual = indexRef.current;
      if (charsActual === 0) {
        setStatus({ kind });
        return;
      }
      const elapsed = startTimeRef.current
        ? (Date.now() - startTimeRef.current) / 1000
        : 0;
      const wordCount = text
        .slice(0, charsActual)
        .split(/\s+/)
        .filter(Boolean).length;
      const finalWpm =
        elapsed > 0 ? Math.round((charsActual / 5) / (elapsed / 60)) : 0;

      setStatus({ kind });

      const payload = {
        charCount: charsActual,
        wordCount,
        avgWpm: finalWpm,
        speedMode: speedRef.current,
        durationSeconds: elapsed,
        targetApp: targetPlatform === TARGET_NONE ? null : targetPlatform,
      };

      // Try once, then retry once after a short delay before giving up.
      let result = await saveTypingSessionAction(payload);
      if (!result.ok) {
        await new Promise((r) => setTimeout(r, 600));
        result = await saveTypingSessionAction(payload);
      }
      if (!result.ok) {
        toast.error("Couldn't save session", {
          description:
            "Your typed text is still here. " +
            (result.error || "Please try Export to save manually."),
        });
      } else if (kind === "complete") {
        toast.success("Session saved", {
          description: `${charsActual.toLocaleString()} chars · ${finalWpm} WPM`,
        });
      }
    },
    [targetPlatform],
  );

  // The recursive tick. Defined inside a useEffect so it picks up the
  // latest closure (`finalizeAndSave`, `isFree`, `openUpgrade`) without
  // assigning to a ref during render — React 19 forbids that.
  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    tickRef.current = () => {
      if (pausedRef.current) return;
      const text = clipRef.current;
      if (indexRef.current >= text.length) {
        setProgress(100);
        void finalizeAndSave("complete");
        return;
      }

      // Free tier mid-typing cap — stop and prompt upgrade.
      if (isFree && indexRef.current >= FREE_CHAR_LIMIT) {
        pausedRef.current = true;
        if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
        setStatus({ kind: "paused" });
        openUpgrade("free-cap");
        return;
      }

      const preset = SPEED_PRESETS[speedRef.current];
      const ch = text[indexRef.current];

      // Typo simulation: emit a wrong char, then correct it.
      if (
        humanRef.current &&
        Math.random() < preset.typoRate &&
        /[a-z]/i.test(ch)
      ) {
        const wrong = String.fromCharCode(
          ch.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1),
        );
        setTypedText((prev) => prev + wrong);
        tickTimerRef.current = setTimeout(() => {
          setTypedText((prev) => prev.slice(0, -1) + ch);
          indexRef.current++;
          const total = text.length;
          setProgress(Math.round((indexRef.current / total) * 100));
          setCharsTyped(indexRef.current);
          const el = startTimeRef.current
            ? (Date.now() - startTimeRef.current) / 60000
            : 0;
          if (el > 0) setWpm(Math.round(indexRef.current / 5 / el));
          tickTimerRef.current = setTimeout(
            () => tickRef.current(),
            randomDelay(preset),
          );
        }, randomDelay(preset) * 2);
        return;
      }

      setTypedText((prev) => prev + ch);
      indexRef.current++;
      const total = text.length;
      setProgress(Math.round((indexRef.current / total) * 100));
      setCharsTyped(indexRef.current);
      const el = startTimeRef.current
        ? (Date.now() - startTimeRef.current) / 60000
        : 0;
      if (el > 0) setWpm(Math.round(indexRef.current / 5 / el));

      tickTimerRef.current = setTimeout(
        () => tickRef.current(),
        randomDelay(preset),
      );
    };
  }, [finalizeAndSave, isFree, openUpgrade]);

  // ─── Controls ─────────────────────────────────────────────────────────
  const readClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.warning("Clipboard is empty");
        return;
      }
      setClipText(text);
      addToHistory(text);
      resetMetrics();
    } catch {
      toast.error("Clipboard access denied — paste text manually");
    }
  }, [addToHistory, resetMetrics]);

  const detectedRedRated = useMemo(() => {
    if (targetPlatform === TARGET_NONE) return null;
    const match = platforms.find((p) => p.name === targetPlatform);
    if (match?.riskLevel === "red") return match;
    return null;
  }, [platforms, targetPlatform]);

  const beginCountdown = useCallback(() => {
    resetMetrics();
    pausedRef.current = false;
    let secs = COUNTDOWN_SECONDS;
    setStatus({ kind: "countdown", secondsLeft: secs });
    countdownTimerRef.current = setInterval(() => {
      secs--;
      if (secs <= 0) {
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        startTimeRef.current = Date.now();
        setStatus({ kind: "typing" });
        // Slight delay so the "Typing…" status renders before first char
        tickTimerRef.current = setTimeout(() => tickRef.current(), 80);
      } else {
        setStatus({ kind: "countdown", secondsLeft: secs });
      }
    }, 1000);
  }, [resetMetrics]);

  const startTyping = useCallback(() => {
    if (!clipText.trim()) {
      toast.warning("Source is empty — paste or read clipboard first");
      return;
    }
    // Free + over-limit: do NOT start. Open upgrade modal and bail.
    // (Verification spec is explicit on this — no partial 1,000-char run.)
    if (isFree && clipText.length > FREE_CHAR_LIMIT) {
      openUpgrade("free-cap");
      return;
    }
    if (isFree && SPEED_PRESETS[speed].pro) {
      openUpgrade(speed);
      return;
    }

    if (detectedRedRated) {
      // Auto-promote to Stealth if user is on a red-rated platform.
      if (!isFree && speed !== "stealth") setSpeed("stealth");
      setWarningOpen(true);
      return;
    }
    beginCountdown();
  }, [
    beginCountdown,
    clipText,
    detectedRedRated,
    isFree,
    openUpgrade,
    speed,
  ]);

  const onWarningProceed = useCallback(() => {
    setWarningOpen(false);
    beginCountdown();
  }, [beginCountdown]);

  const onPause = useCallback(() => {
    pausedRef.current = true;
    if (tickTimerRef.current) clearTimeout(tickTimerRef.current);
    setStatus({ kind: "paused" });
  }, []);

  const onResume = useCallback(() => {
    pausedRef.current = false;
    setStatus({ kind: "typing" });
    tickTimerRef.current = setTimeout(() => tickRef.current(), 50);
  }, []);

  /**
   * Stop = abort + save partial + reset.
   *
   * finalizeAndSave reads indexRef and friends synchronously before its
   * first await, so it has already snapshotted the work-done numbers
   * by the time resetMetrics() clobbers the refs. The save still posts
   * the correct partial counts; the visible state is wiped immediately
   * so Start is ready for the next run.
   */
  const onStop = useCallback(() => {
    void finalizeAndSave("stopped");
    resetMetrics();
  }, [finalizeAndSave, resetMetrics]);

  const onReset = useCallback(() => {
    resetMetrics();
    setStatus({ kind: "idle" });
  }, [resetMetrics]);

  const onExport = useCallback(() => {
    const blob = new Blob([typedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Spec asks for the literal filename — multiple downloads in one
    // session will get auto-numbered by the browser ("(1)", "(2)").
    a.download = "cliptypepro-session.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [typedText]);

  // ─── Derived UI bits ─────────────────────────────────────────────────
  const statusLabel =
    status.kind === "idle"
      ? "Ready"
      : status.kind === "countdown"
        ? `Starting in ${status.secondsLeft}s…`
        : status.kind === "typing"
          ? "● Typing"
          : status.kind === "paused"
            ? "⏸ Paused"
            : status.kind === "complete"
              ? "✓ Done"
              : "Stopped";

  const overFreeCap = isFree && clipText.length > FREE_CHAR_LIMIT;

  return (
    <div className="fade-up" style={{ display: "grid", gap: 14 }}>
      <div>
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 19,
            fontWeight: 700,
            marginBottom: 4,
          }}
        >
          Clipboard Typer
        </h1>
        <p style={{ color: "var(--c-text-dim)", fontSize: 13 }}>
          Copy → auto-types character by character into any app
        </p>
      </div>

      {/* Free-tier character meter */}
      {isFree && clipText.length > 0 && (
        <FreeCapMeter
          length={clipText.length}
          over={overFreeCap}
          onUpgrade={() => openUpgrade("free-cap")}
        />
      )}

      {/* Source + Output */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
        className="typer-cols"
      >
        <Card label="📋 Source Text">
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={readClipboard}
              style={{
                padding: "6px 13px",
                borderRadius: 7,
                border: "1px solid var(--c-border)",
                background: "var(--c-surface-b)",
                color: "var(--c-text-dim)",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ⊕ Read Clipboard
            </button>
            {clipText && (
              <button
                type="button"
                onClick={() => {
                  setClipText("");
                  resetMetrics();
                }}
                style={{
                  padding: "6px 11px",
                  borderRadius: 7,
                  background: "transparent",
                  border: "none",
                  color: "var(--c-text-muted)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "var(--c-text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {clipText.length.toLocaleString()} chars ·{" "}
              {clipText.trim()
                ? clipText.trim().split(/\s+/).length.toLocaleString()
                : 0}{" "}
              words
            </span>
          </div>
          <AutoGrowTextarea
            value={clipText}
            onChange={(v) => {
              setClipText(v);
              resetMetrics();
            }}
            placeholder="Paste text here or click Read Clipboard…"
          />
        </Card>

        <Card label="⌨ Live Output">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color:
                  status.kind === "typing"
                    ? "var(--c-success)"
                    : status.kind === "paused"
                      ? "var(--c-warning)"
                      : status.kind === "complete"
                        ? "var(--c-primary)"
                        : "var(--c-text-muted)",
                animation:
                  status.kind === "typing" ? "pulse 1.5s infinite" : "none",
              }}
            >
              {statusLabel}
            </span>
            {status.kind === "complete" && typedText && (
              <button
                type="button"
                onClick={onExport}
                style={{
                  padding: "5px 10px",
                  borderRadius: 6,
                  border:
                    "1px solid color-mix(in srgb, var(--c-success) 35%, transparent)",
                  background:
                    "color-mix(in srgb, var(--c-success) 12%, transparent)",
                  color: "var(--c-success)",
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ↓ Export .txt
              </button>
            )}
          </div>
          <OutputView
            text={typedText}
            complete={status.kind === "complete"}
          />
          <div
            style={{
              marginTop: 7,
              height: 3,
              background: "var(--c-border)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, var(--c-primary), var(--c-accent))",
                transition: "width .08s",
              }}
            />
          </div>
        </Card>
      </div>

      {/* Stats row */}
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          padding: "12px 16px",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 10,
        }}
        className="typer-stats"
      >
        <Stat label="WPM" value={wpm || "—"} />
        <Stat label="Typed" value={charsTyped} />
        <Stat label="Progress" value={`${progress}%`} />
        <Stat label="Mode" value={SPEED_PRESETS[speed].label} />
        <Stat
          label="Human"
          value={humanMode ? "ON" : "OFF"}
          color={humanMode ? "var(--c-success)" : "var(--c-text-muted)"}
        />
      </div>

      {/* Speed profile */}
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div style={{ ...labelStyle, marginBottom: 8 }}>Speed Profile</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 7 }}>
          {SPEED_ORDER.map((k) => {
            const pr = SPEED_PRESETS[k];
            const locked = isFree && pr.pro;
            const active = speed === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (locked) {
                    openUpgrade(k);
                    return;
                  }
                  setSpeed(k);
                }}
                style={{
                  padding: "6px 13px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${active ? "var(--c-primary)" : "var(--c-border)"}`,
                  background: active
                    ? "color-mix(in srgb, var(--c-primary) 15%, transparent)"
                    : "transparent",
                  color: active ? "var(--c-primary)" : "var(--c-text-dim)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {pr.label}
                {locked && <Lock size={10} />}
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
          {SPEED_PRESETS[speed].desc}
        </div>
      </div>

      {/* Target platform + Window Lock + Human toggle + Controls */}
      <div
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          padding: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ ...labelStyle, marginBottom: 4 }}>Target platform (optional)</div>
            <select
              value={targetPlatform}
              onChange={(e) => setTargetPlatform(e.target.value)}
              style={{
                width: "100%",
                background: "var(--c-surface-b)",
                border: "1px solid var(--c-border)",
                borderRadius: 7,
                padding: "8px 10px",
                color: "var(--c-text)",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
              }}
            >
              <option value={TARGET_NONE}>— None / generic —</option>
              {platforms.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.riskLevel === "red"
                    ? "🔴 "
                    : p.riskLevel === "yellow"
                      ? "🟡 "
                      : "🟢 "}
                  {p.name}
                </option>
              ))}
            </select>
            {detectedRedRated && (
              <div
                style={{
                  marginTop: 5,
                  fontSize: 10,
                  color: "var(--c-danger)",
                  fontWeight: 600,
                }}
              >
                ⚠ Red-rated platform — Stealth mode + warning before typing.
              </div>
            )}
          </div>

          <WindowLockControl
            isFree={isFree}
            value={windowLock}
            onChange={setWindowLock}
            onUpgrade={() => openUpgrade("window-lock")}
          />

          <HumanToggle value={humanMode} onChange={setHumanMode} />
        </div>

        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {(status.kind === "idle" ||
            status.kind === "complete" ||
            status.kind === "stopped") && (
            <PrimaryBtn onClick={startTyping}>▶ Start Typing</PrimaryBtn>
          )}
          {status.kind === "countdown" && (
            <PrimaryBtn disabled>Starting in {status.secondsLeft}s…</PrimaryBtn>
          )}
          {status.kind === "typing" && (
            <SecondaryBtn onClick={onPause}>⏸ Pause</SecondaryBtn>
          )}
          {status.kind === "paused" && (
            <PrimaryBtn onClick={onResume} success>
              ▶ Resume
            </PrimaryBtn>
          )}
          {(status.kind === "countdown" ||
            status.kind === "typing" ||
            status.kind === "paused") && (
            <DangerBtn onClick={onStop}>⏹ Stop</DangerBtn>
          )}
          {(status.kind === "complete" || status.kind === "stopped") && (
            <SecondaryBtn onClick={onReset}>↺ Reset</SecondaryBtn>
          )}
          {status.kind === "complete" && (
            <SuccessBtn onClick={onExport}>↓ Export .txt</SuccessBtn>
          )}
        </div>
      </div>

      {/* Clipboard history */}
      {history.length > 0 && (
        <div
          style={{
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            padding: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <span style={labelStyle}>Clipboard History (last {history.length})</span>
            <button
              type="button"
              onClick={clearHistory}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--c-text-muted)",
                fontSize: 10,
                cursor: "pointer",
                padding: 4,
              }}
            >
              Clear all
            </button>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {history.map((h) => (
              <div
                key={h.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 7,
                  background: "var(--c-surface-b)",
                  border: "1px solid var(--c-border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setClipText(h.text);
                    resetMetrics();
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    background: "transparent",
                    border: "none",
                    color: "var(--c-text)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    textAlign: "left",
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    padding: 0,
                  }}
                  title="Click to load into source"
                >
                  {h.preview}
                </button>
                <span style={{ fontSize: 10, color: "var(--c-text-muted)" }}>
                  {h.length.toLocaleString()} chars
                </span>
                <button
                  type="button"
                  onClick={() => removeHistory(h.id)}
                  aria-label="Remove from history"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--c-text-muted)",
                    cursor: "pointer",
                    fontSize: 14,
                    padding: 2,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <PlatformWarningModal
        open={warningOpen}
        platform={detectedRedRated?.name ?? null}
        onProceed={onWarningProceed}
        onCancel={() => setWarningOpen(false)}
      />

      <style>{`
        @media (max-width: 720px) {
          .typer-cols { grid-template-columns: 1fr !important; }
          .typer-stats { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 420px) {
          .typer-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Tiny presentational helpers ───────────────────────────────────────

const labelStyle = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  color: "var(--c-text-muted)",
  textTransform: "uppercase" as const,
};

/**
 * Read-only live-output surface.
 *
 * Renders the typed text in a scrollable div that:
 *   - grows naturally with content (no JS height-mutation per char)
 *   - caps at 60vh; past that it scrolls internally
 *   - auto-scrolls to the bottom on every text update so the latest
 *     character is always in view
 *
 * We use a div + `white-space: pre-wrap` instead of a <textarea> because
 * the output is read-only by design — users never type into it.
 */
function OutputView({ text, complete }: { text: string; complete: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  // Pin to the bottom whenever text grows. Cheap — only sets scrollTop,
  // browser elides the work when we're already at the bottom.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [text]);

  return (
    <div
      ref={ref}
      role="log"
      aria-live="polite"
      aria-atomic="false"
      style={{
        width: "100%",
        background: "var(--c-surface-b)",
        border: "1px solid var(--c-border)",
        borderRadius: 7,
        padding: "10px 12px",
        color: complete ? "var(--c-success)" : "var(--c-text)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.65,
        boxSizing: "border-box",
        // Grow naturally; cap at viewport-relative height before internal scroll.
        minHeight: 150,
        maxHeight: "clamp(200px, 60vh, 600px)",
        overflowY: "auto",
        // Preserve newlines + spacing exactly as typed.
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text || (
        <span style={{ color: "var(--c-text-muted)" }}>
          Output appears here in real time…
        </span>
      )}
    </div>
  );
}

/**
 * Auto-growing source textarea.
 *
 * Mirrors the read-only OutputView's behaviour for the editable side:
 * grows naturally with content, caps at 60vh, internal-scrolls past
 * the cap. Same min height (150px) so an empty state feels intentional.
 *
 * Implementation note: a real <textarea> doesn't grow with content
 * natively — we reset height to "auto" so scrollHeight reflects pure
 * content size, then set height to that. The CSS max-height clamps the
 * visible box and CSS overflow-y handles the scroll past the cap.
 *
 * Re-measures on:
 *   - value change (paste, history-click, manual edit)
 *   - window resize (line wrapping changes column width)
 */
function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 1. reset so scrollHeight reports natural content height
    // 2. set height to that (max-height CSS clamps it; overflow-y scrolls past)
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    const onResize = () => {
      const el = ref.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      style={{
        width: "100%",
        background: "var(--c-surface-b)",
        border: "1px solid var(--c-border)",
        borderRadius: 7,
        padding: "10px 12px",
        color: "var(--c-text)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        lineHeight: 1.65,
        outline: "none",
        boxSizing: "border-box",
        minHeight: 150,
        maxHeight: "clamp(200px, 60vh, 600px)",
        overflowY: "auto",
        // We control height via JS — disable manual drag handle so the
        // user's resize doesn't fight the next auto-measurement.
        resize: "none",
      }}
    />
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: "1px solid var(--c-border)",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div style={{ ...labelStyle, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          fontWeight: 700,
          lineHeight: 1,
          color: color ?? "var(--c-primary)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--c-text-muted)",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FreeCapMeter({
  length,
  over,
  onUpgrade,
}: {
  length: number;
  over: boolean;
  onUpgrade: () => void;
}) {
  const visible = Math.min(length, FREE_CHAR_LIMIT);
  const pct = Math.min((length / FREE_CHAR_LIMIT) * 100, 100);
  return (
    <div
      style={{
        background: "var(--c-surface)",
        border: `1px solid ${over ? "var(--c-danger)" : "var(--c-border)"}`,
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          marginBottom: 5,
        }}
      >
        <span style={{ color: "var(--c-text-dim)" }}>
          Free: {visible.toLocaleString()} / {FREE_CHAR_LIMIT.toLocaleString()} chars
        </span>
        {over && (
          <span style={{ color: "var(--c-danger)", fontWeight: 600 }}>
            ⚠ Limit exceeded —{" "}
            <button
              type="button"
              onClick={onUpgrade}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--c-danger)",
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
                padding: 0,
              }}
            >
              Upgrade
            </button>
          </span>
        )}
      </div>
      <div
        style={{
          height: 4,
          background: "var(--c-border)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: over ? "var(--c-danger)" : "var(--c-primary)",
            borderRadius: 2,
            transition: "width .2s",
          }}
        />
      </div>
    </div>
  );
}

function HumanToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 11, color: "var(--c-text-dim)" }}>Human Mode</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: 38,
          height: 21,
          borderRadius: 11,
          background: value ? "var(--c-primary)" : "var(--c-border-l)",
          position: "relative",
          cursor: "pointer",
          border: "none",
          transition: "background .2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: value ? 19 : 3,
            width: 15,
            height: 15,
            borderRadius: "50%",
            background: value ? "#000" : "var(--c-text-muted)",
            transition: "left .2s",
          }}
        />
      </button>
    </div>
  );
}

function WindowLockControl({
  isFree,
  value,
  onChange,
  onUpgrade,
}: {
  isFree: boolean;
  value: boolean;
  onChange: (v: boolean) => void;
  onUpgrade: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--c-text-dim)",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Window Lock
        {isFree && <Lock size={10} />}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={!isFree && value}
        onClick={() => {
          if (isFree) {
            onUpgrade();
            return;
          }
          onChange(!value);
        }}
        style={{
          width: 38,
          height: 21,
          borderRadius: 11,
          background: !isFree && value ? "var(--c-primary)" : "var(--c-border-l)",
          position: "relative",
          cursor: "pointer",
          border: "none",
          transition: "background .2s",
          flexShrink: 0,
          opacity: isFree ? 0.7 : 1,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: !isFree && value ? 19 : 3,
            width: 15,
            height: 15,
            borderRadius: "50%",
            background: !isFree && value ? "#000" : "var(--c-text-muted)",
            transition: "left .2s",
          }}
        />
      </button>
    </div>
  );
}

// ─── Action buttons ─────────────────────────────────────────────────────

function PrimaryBtn({
  children,
  onClick,
  disabled,
  success,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  success?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 18px",
        borderRadius: 8,
        background: success ? "var(--c-success)" : "var(--c-primary)",
        color: "#000",
        border: "none",
        fontWeight: 700,
        fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: 8,
        background: "var(--c-surface-b)",
        color: "var(--c-text)",
        border: "1px solid var(--c-border)",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </button>
  );
}

function DangerBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: 8,
        background: "color-mix(in srgb, var(--c-danger) 18%, transparent)",
        color: "var(--c-danger)",
        border: "1px solid color-mix(in srgb, var(--c-danger) 40%, transparent)",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </button>
  );
}

function SuccessBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: 8,
        background: "color-mix(in srgb, var(--c-success) 18%, transparent)",
        color: "var(--c-success)",
        border: "1px solid color-mix(in srgb, var(--c-success) 40%, transparent)",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </button>
  );
}
