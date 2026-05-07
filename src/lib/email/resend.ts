import "server-only";
import { Resend } from "resend";

/**
 * Server-only Resend wrapper.
 *
 * Failure modes are surfaced as a discriminated union — callers branch
 * on `ok` and decide whether to expose the error to the user (e.g.
 * Resend's "domain not verified" message) or just log it.
 *
 * Test-mode behaviour: in development (or whenever RESEND_API_KEY is
 * unset), we don't hit the API — we log the email to stdout and
 * report success. This keeps the rest of the flow working when a dev
 * doesn't have a Resend key handy. In production, missing key returns
 * an error so the failure is visible.
 *
 * From-address: defaults to Resend's no-config-needed onboarding
 * address so test-mode keys (which can only send to your own verified
 * Resend account email) work out of the box. Override via
 * RESEND_FROM_EMAIL once you've verified a sending domain.
 */

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

let _client: Resend | null = null;
function client(): Resend | null {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _client = new Resend(key);
  return _client;
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "ClipType Pro <onboarding@resend.dev>";
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const c = client();
  if (!c) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        error: "RESEND_API_KEY is not configured. Set it in your env to send emails.",
      };
    }
    // Dev fallback: log and pretend to succeed.
    console.info("[email/dev] would send:", {
      to: args.to,
      subject: args.subject,
      preview: args.text.slice(0, 200),
    });
    return { ok: true, id: "dev-noop" };
  }

  try {
    const result = await c.emails.send({
      from: fromAddress(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });
    if (result.error) {
      return { ok: false, error: result.error.message };
    }
    return { ok: true, id: result.data?.id ?? "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
