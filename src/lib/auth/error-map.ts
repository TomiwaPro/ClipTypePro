/**
 * Map Supabase auth errors to user-friendly strings.
 *
 * Supabase returns errors with both a message and (sometimes) a code. Codes
 * are stable across versions; messages are not. Match codes first, fall back
 * to message string matching for older error shapes.
 */
export function mapAuthError(err: { message?: string; code?: string; status?: number } | null): string {
  if (!err) return "Something went wrong. Try again.";

  // Code-based mapping (preferred — stable)
  switch (err.code) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "Please verify your email before signing in. Check your inbox.";
    case "user_already_exists":
    case "email_exists":
      return "An account with that email already exists. Try signing in.";
    case "weak_password":
      return "That password is too easy to guess. Add length, mixed case, or a number.";
    case "over_email_send_rate_limit": {
      // Per-email throttle (default ~60s window). Supabase often inlines the
      // wait time: "For security purposes, you can only request this once every N seconds".
      const seconds = parseRetryAfterSeconds(err.message);
      return seconds
        ? `Wait ${seconds}s before requesting another email for this address.`
        : "You can only request another email every 60 seconds for the same address.";
    }
    case "over_request_rate_limit":
      // Per-project / per-IP. On Supabase free tier the shared SMTP caps at
      // ~3 emails/hour total — be honest that "wait a minute" doesn't fix it.
      return "Project email rate limit reached. On the free tier this is ~3 emails/hour. Wait, or set up a custom SMTP (Resend) to remove the cap.";
    case "user_not_found":
      return "We couldn't find an account with that email.";
    case "same_password":
      return "New password must be different from your current one.";
  }

  // String-based fallback for older Supabase versions / OAuth providers
  const msg = (err.message ?? "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "Incorrect email or password.";
  if (msg.includes("email not confirmed")) return "Please verify your email before signing in. Check your inbox.";
  if (msg.includes("user already registered")) return "An account with that email already exists. Try signing in.";
  if (msg.includes("password should be")) return "That password doesn't meet our requirements.";
  if (msg.includes("you can only request this once every")) {
    const seconds = parseRetryAfterSeconds(err.message);
    return seconds
      ? `Wait ${seconds}s before requesting another email.`
      : "Wait a minute before requesting another email.";
  }
  if (msg.includes("email rate limit") || msg.includes("rate limit")) {
    return "Project email rate limit reached. On the free tier this is ~3 emails/hour. Wait, or set up a custom SMTP (Resend) to remove the cap.";
  }

  return err.message || "Something went wrong. Try again.";
}

/**
 * Pull "N" out of "you can only request this once every N seconds".
 * Returns null if the message has no embedded seconds.
 */
export function parseRetryAfterSeconds(message: string | undefined): number | null {
  if (!message) return null;
  const m = message.match(/every\s+(\d+)\s+second/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

/**
 * Inspect a raw Supabase auth error and return the cooldown the UI should
 * wait before allowing another resend. Used by the verify-email page.
 *
 *   - per-email rate limit:    parsed N seconds, fallback 60
 *   - per-project rate limit:  3600s (1 hour — free tier reality)
 *   - any other error / success: caller picks (default 60)
 */
export function cooldownForError(err: { message?: string; code?: string } | null): number | null {
  if (!err) return null;
  if (err.code === "over_email_send_rate_limit") {
    return parseRetryAfterSeconds(err.message) ?? 60;
  }
  if (err.code === "over_request_rate_limit") return 3600;
  const msg = (err.message ?? "").toLowerCase();
  if (msg.includes("you can only request this once every")) {
    return parseRetryAfterSeconds(err.message) ?? 60;
  }
  if (msg.includes("rate limit")) return 3600;
  return null;
}
