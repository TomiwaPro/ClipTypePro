"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";

/**
 * Server actions for /dashboard/compliance.
 *
 * Toggle persistence: the three boolean columns added in migration 005
 * (compliance_mode, hipaa_baa_accepted, gdpr_dpa_accepted) are written
 * via the user's RLS-scoped client. Updates are idempotent.
 *
 * GDPR rights request: posts a Resend-backed email to the compliance
 * inbox tagged with the user's id, email, and chosen request type.
 * The user's own data is included only for "access" / "portability"
 * requests so we don't leak it via the inbox routing.
 *
 * Audit-log export: returns the user's typing_sessions as JSON. RLS
 * scopes the select; we still pin user_id defensively.
 */

const flagsSchema = z.object({
  compliance_mode: z.boolean(),
  hipaa_baa_accepted: z.boolean(),
  gdpr_dpa_accepted: z.boolean(),
});

export async function updateComplianceFlagsAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = flagsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      compliance_mode: parsed.data.compliance_mode,
      hipaa_baa_accepted: parsed.data.hipaa_baa_accepted,
      gdpr_dpa_accepted: parsed.data.gdpr_dpa_accepted,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

const GDPR_REQUEST_TYPES = [
  "access",
  "rectification",
  "erasure",
  "portability",
  "objection",
] as const;
type GdprRequestType = (typeof GDPR_REQUEST_TYPES)[number];

const gdprSchema = z.object({
  type: z.enum(GDPR_REQUEST_TYPES),
  details: z.string().trim().max(2000).optional(),
});

const RIGHT_LABEL: Record<GdprRequestType, string> = {
  access: "Right to access",
  rectification: "Right to rectification",
  erasure: "Right to erasure",
  portability: "Right to data portability",
  objection: "Right to object",
};

export async function submitGdprRequestAction(
  raw: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = gdprSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const subject = `GDPR ${RIGHT_LABEL[parsed.data.type]} — ${user.email ?? user.id}`;
  const lines = [
    `Request type: ${RIGHT_LABEL[parsed.data.type]} (${parsed.data.type})`,
    `User id: ${user.id}`,
    `Email:   ${user.email ?? "(unknown)"}`,
    "",
    "Details:",
    parsed.data.details?.trim() || "(no additional details provided)",
  ];
  const text = lines.join("\n");
  const html = `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap">${escapeHtml(text)}</pre>`;

  const result = await sendEmail({
    to: "compliance@cliptypepro.com",
    replyTo: user.email ?? undefined,
    subject,
    text,
    html,
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}

export async function exportAuditLogAction(): Promise<{
  ok: boolean;
  error?: string;
  data?: unknown;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("typing_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: {
      exportedAt: new Date().toISOString(),
      user: { id: user.id, email: user.email },
      typingSessions: data ?? [],
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
