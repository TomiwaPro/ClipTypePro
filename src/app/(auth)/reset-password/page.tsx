import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "./reset-password-form";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  // The user must reach this page from the password-recovery email link,
  // which lands at /auth/callback first; that callback exchanges the code
  // for a session and redirects here. Without a session, gently redirect.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthCard
        title="Link expired or invalid"
        subtitle="Request a fresh reset link"
        footer={
          <Link
            href="/forgot-password"
            style={{ color: "var(--c-primary)", fontWeight: 600 }}
          >
            Request a new link
          </Link>
        }
      >
        <p
          style={{
            fontSize: 13,
            color: "var(--c-text-dim)",
            lineHeight: 1.65,
            textAlign: "center",
            padding: "8px 0 4px",
          }}
        >
          Reset links expire after 1 hour and can only be used once. Start over
          from the &ldquo;Forgot password&rdquo; page.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Use 8+ characters with mixed case and a number"
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
