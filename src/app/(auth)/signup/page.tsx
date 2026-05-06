import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Start your free trial"
      subtitle="14 days Pro free — no card required"
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            style={{ color: "var(--c-primary)", fontWeight: 600 }}
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthCard>
  );
}
