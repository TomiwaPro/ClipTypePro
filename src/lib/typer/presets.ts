/**
 * Speed presets for the typing engine.
 *
 * Each preset defines a min/max delay (ms per character) and a typo rate
 * used by the Human Mode toggle. Free users get the lower-risk presets
 * (Human, Balanced); the rest are Pro-only.
 *
 * The numbers are tuned to match the v4 prototype — feels indistinguishable
 * from human at Stealth, obviously synthetic at Instant.
 */

export type SpeedKey = "stealth" | "human" | "balanced" | "fast" | "instant";

export type SpeedPreset = {
  key: SpeedKey;
  label: string;
  min: number;
  max: number;
  typoRate: number;
  desc: string;
  pro: boolean;
};

export const SPEED_PRESETS: Record<SpeedKey, SpeedPreset> = {
  stealth: {
    key: "stealth",
    label: "Stealth",
    min: 90,
    max: 230,
    typoRate: 0.045,
    desc: "Ultra-human — undetectable",
    pro: true,
  },
  human: {
    key: "human",
    label: "Human",
    min: 55,
    max: 160,
    typoRate: 0.025,
    desc: "Natural human pacing",
    pro: false,
  },
  balanced: {
    key: "balanced",
    label: "Balanced",
    min: 25,
    max: 70,
    typoRate: 0.008,
    desc: "Fast but realistic",
    pro: false,
  },
  fast: {
    key: "fast",
    label: "Fast",
    min: 8,
    max: 22,
    typoRate: 0,
    desc: "Maximum speed",
    pro: true,
  },
  instant: {
    key: "instant",
    label: "Instant",
    min: 1,
    max: 5,
    typoRate: 0,
    desc: "Near-instant output",
    pro: true,
  },
};

export const SPEED_ORDER: SpeedKey[] = [
  "stealth",
  "human",
  "balanced",
  "fast",
  "instant",
];

/** Hard character cap on the free tier per typing session. */
export const FREE_CHAR_LIMIT = 1000;

/** Random delay within a preset's window. */
export function randomDelay(preset: SpeedPreset): number {
  return Math.round(Math.random() * (preset.max - preset.min) + preset.min);
}
