/**
 * Frozen shared email/password policy.
 *
 * Used by BOTH the Better Auth email/password configuration and the trusted
 * provisioning path, so a provisioned credential always satisfies the same
 * rules a public /sign-up/email call would enforce.
 */
export const EMAIL_PASSWORD_POLICY = {
  minPasswordLength: 8,
  maxPasswordLength: 128,
  maxNameLength: 200,
} as const;
