import { z } from 'zod';

// Auth register + lupa password (Promotor Class/Flow).
// File terpisah agar packages/contracts/src/index.ts tetap beku (guardrail B1).
export const signUpSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgetPasswordSchema = z.object({
  email: z.string().email(),
});
export type ForgetPasswordInput = z.infer<typeof forgetPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
