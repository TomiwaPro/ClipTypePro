"use server";

import { createClient } from "@/lib/supabase/server";
import type { SpeedKey } from "./presets";

export type SaveSessionInput = {
  charCount: number;
  wordCount: number;
  avgWpm: number;
  speedMode: SpeedKey;
  durationSeconds: number;
  targetApp?: string | null;
};

/**
 * Persist a completed typing session to `typing_sessions`.
 *
 * Called from the client after a Stop or Done state. RLS on the table
 * enforces user_id = auth.uid(), so even if the client lies about user
 * affiliation, the row is bound to the authenticated session.
 */
export async function saveTypingSessionAction(
  input: SaveSessionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Bound the inputs — we trust auth, but the client can still send
  // garbage if it wants. Keep the row's CHECK constraints happy.
  if (input.charCount < 0 || input.wordCount < 0 || input.avgWpm < 0 || input.durationSeconds < 0) {
    return { ok: false, error: "Negative metrics aren't valid." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("typing_sessions").insert({
    user_id: user.id,
    char_count: Math.round(input.charCount),
    word_count: Math.round(input.wordCount),
    avg_wpm: Math.round(input.avgWpm),
    speed_mode: input.speedMode,
    duration_seconds: Math.round(input.durationSeconds),
    target_app: input.targetApp ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
