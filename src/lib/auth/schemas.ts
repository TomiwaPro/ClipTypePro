import { z } from "zod";

// ─── Reusable building blocks ────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Valid email required");

export const passwordMinSchema = z
  .string()
  .min(8, "At least 8 characters");

// Strong password (used for signup + reset). Lower bar on login: don't punish
// users for forgetting how strict the rules were when they first signed up.
export const passwordStrongSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/\d/, "Add a number");

// ─── Page schemas ────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordMinSchema,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Your name helps us personalise your trial")
      .max(80, "Keep it under 80 characters"),
    email: emailSchema,
    password: passwordStrongSchema,
    useCase: z.string().min(1, "Pick the closest match"),
    agreeTos: z.literal(true, {
      message: "You must agree to the Terms and Privacy Policy",
    }),
    agreeAcademic: z.literal(true, {
      message: "Confirm you won't use ClipType Pro to cheat in exams",
    }),
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordStrongSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ─── Use cases (matches the v4 prototype list) ───────────────────────────────

export const USE_CASES = [
  "Customer Support",
  "Healthcare / Clinical",
  "Legal / Compliance",
  "Software Development",
  "Streaming / Content",
  "Sales & Outreach",
  "Accessibility",
  "Education",
  "Other",
] as const;

// ─── Password strength estimator ─────────────────────────────────────────────
// Cheap, no-dep tiering aligned with the Step 3 spec:
//   Weak   — < 6 chars (or any obvious junk like "password", repeat chars)
//   Medium — 6+ chars with at least mixed case OR numbers/symbols
//   Strong — 11+ chars with both numbers AND symbols
// 0=empty (no meter shown), 1=weak, 2=medium, 3=strong.

export function estimatePasswordStrength(pw: string): {
  score: 0 | 1 | 2 | 3;
  label: "" | "Weak" | "Medium" | "Strong";
} {
  if (!pw) return { score: 0, label: "" };

  // Hard fail — common junk passwords are always Weak regardless of length
  if (
    /^(?:password|123456|qwerty|letmein|admin)\d*$/i.test(pw) ||
    /^(.)\1+$/.test(pw) // all one character
  ) {
    return { score: 1, label: "Weak" };
  }

  const len = pw.length;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasSymbol = /[^a-zA-Z\d]/.test(pw);
  const mixedCase = hasLower && hasUpper;

  if (len >= 11 && hasNumber && hasSymbol) {
    return { score: 3, label: "Strong" };
  }

  if (len >= 6 && (mixedCase || hasNumber || hasSymbol)) {
    return { score: 2, label: "Medium" };
  }

  return { score: 1, label: "Weak" };
}
