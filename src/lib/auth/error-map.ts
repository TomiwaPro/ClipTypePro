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
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a minute and try again.";
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

  return err.message || "Something went wrong. Try again.";
}
