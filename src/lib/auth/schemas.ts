import { z } from "zod";

// ─── Reusable building blocks ────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Enter a valid email address");

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
// Cheap heuristic — no external dep. Returns 0-4 score.
// 0=empty, 1=weak, 2=fair, 3=strong, 4=excellent.

export function estimatePasswordStrength(pw: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!pw) return { score: 0, label: "" };

  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^a-zA-Z\d]/.test(pw)) score++;

  // Penalties
  if (/^(.)\1+$/.test(pw)) score = 1; // all one character
  if (/^(?:password|123456|qwerty|letmein|admin)\d*$/i.test(pw)) score = 1;

  const clamped = Math.min(4, Math.max(0, score)) as 0 | 1 | 2 | 3 | 4;
  const label = ["", "Weak", "Fair", "Strong", "Excellent"][clamped];
  return { score: clamped, label };
}
