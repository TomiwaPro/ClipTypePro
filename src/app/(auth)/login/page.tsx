import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./login-form";

type SearchParams = Promise<{
  next?: string;
  error?: string;
  reset?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            style={{ color: "var(--c-primary)", fontWeight: 600 }}
          >
            Start free trial
          </Link>
        </>
      }
    >
      {sp.reset === "success" && (
        <div
          style={{
            background: "color-mix(in srgb, var(--c-success) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--c-success) 40%, transparent)",
            color: "var(--c-success)",
            borderRadius: 7,
            padding: "10px 12px",
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          ✓ Password updated. Sign in with your new password.
        </div>
      )}
      {sp.error && (
        <div
          style={{
            background: "color-mix(in srgb, var(--c-danger) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--c-danger) 40%, transparent)",
            color: "var(--c-danger)",
            borderRadius: 7,
            padding: "10px 12px",
            fontSize: 12,
            marginBottom: 16,
          }}
        >
          {sp.error}
        </div>
      )}
      <LoginForm />
    </AuthCard>
  );
}
