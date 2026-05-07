"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Server actions for the API portal.
 *
 * Storage model (matches the api_keys schema, sha-256 per the table
 * comment):
 *   - key_prefix: first 20 chars of the full key — safe to display in
 *     the UI as a stable identifier (8 random hex = ~4B distinct
 *     prefixes, can't be used to brute-force the 32-char secret)
 *   - key_hash:   sha-256 hex of the full key — used to verify
 *     incoming Authorization headers without ever storing the
 *     plaintext
 *
 * The full key is returned to the client EXACTLY ONCE, in the
 * generate/regenerate response. We do not log it or persist it. If
 * the user loses it they must regenerate.
 *
 * RLS scopes api_keys to user_id; we still pin .eq("user_id", ...)
 * defensively on every mutation so a compromised RLS policy can't
 * widen the blast radius.
 */

const KEY_PREFIX_LENGTH = 20; // "ctp_live_sk_" + 8 hex chars
const RANDOM_BYTES = 16; // → 32 hex chars
const ENV_MODE: "live" | "test" =
  process.env.NODE_ENV === "production" ? "live" : "test";

function generatePlainKey(): { full: string; prefix: string; hash: string } {
  const rand = crypto.randomBytes(RANDOM_BYTES).toString("hex");
  const full = `ctp_${ENV_MODE}_sk_${rand}`;
  const prefix = full.slice(0, KEY_PREFIX_LENGTH);
  const hash = crypto.createHash("sha256").update(full).digest("hex");
  return { full, prefix, hash };
}

const labelSchema = z
  .string()
  .trim()
  .max(80, "Label is too long")
  .optional();

export async function generateApiKeyAction(
  rawLabel: unknown,
): Promise<
  | { ok: true; fullKey: string; prefix: string; id: string }
  | { ok: false; error: string }
> {
  const parsed = labelSchema.safeParse(rawLabel);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid label",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Cap the number of active keys per user to keep the rotation flow
  // honest. Beyond this, force the user to revoke before generating.
  const { count } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if ((count ?? 0) >= 5) {
    return {
      ok: false,
      error: "You already have 5 active keys. Revoke one before generating another.",
    };
  }

  // Retry once on the astronomically-unlikely hash collision (sha-256
  // of a 16-byte random plus an 8-hex prefix collision: 2^-256 + 2^-32).
  for (let attempt = 0; attempt < 2; attempt++) {
    const { full, prefix, hash } = generatePlainKey();
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        key_hash: hash,
        key_prefix: prefix,
        label: parsed.data && parsed.data.length > 0 ? parsed.data : null,
      })
      .select("id")
      .single();
    if (!error && data) {
      revalidatePath("/dashboard/api");
      return { ok: true, fullKey: full, prefix, id: data.id as string };
    }
    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: "Couldn't generate a unique key — try again." };
}

const idSchema = z.string().uuid();

export async function regenerateApiKeyAction(
  rawId: unknown,
): Promise<
  | { ok: true; fullKey: string; prefix: string; id: string }
  | { ok: false; error: string }
> {
  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Invalid key id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: existing, error: lookupErr } = await supabase
    .from("api_keys")
    .select("id, label, revoked_at")
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupErr) return { ok: false, error: lookupErr.message };
  if (!existing) return { ok: false, error: "Key not found" };

  // Revoke the old key first. Even if the new-key insert fails, the
  // old one stays revoked — fail-closed is safer than fail-open.
  if (!existing.revoked_at) {
    const { error: revokeErr } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("user_id", user.id);
    if (revokeErr) return { ok: false, error: revokeErr.message };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const { full, prefix, hash } = generatePlainKey();
    const { data, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        key_hash: hash,
        key_prefix: prefix,
        label: (existing.label as string | null) ?? null,
      })
      .select("id")
      .single();
    if (!error && data) {
      revalidatePath("/dashboard/api");
      return { ok: true, fullKey: full, prefix, id: data.id as string };
    }
    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: "Couldn't generate a unique key — try again." };
}

export async function revokeApiKeyAction(
  rawId: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) return { ok: false, error: "Invalid key id" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("user_id", user.id)
    .is("revoked_at", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/api");
  return { ok: true };
}
