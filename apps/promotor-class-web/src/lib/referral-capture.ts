/**
 * Helper to capture and normalize referral codes for prototype presentation only.
 * Does NOT mutate Contact, Enrollment, MockStateStore or Shared Contracts.
 */
export function capturePrototypeReferralCode(rawCode: string | null | undefined): boolean {
  if (!rawCode || typeof window === 'undefined') return false;

  const normalized = rawCode.trim().toUpperCase();

  // Validate format: 4 to 12 alphanumeric characters (case-insensitive)
  if (!/^[A-Z0-9]{4,12}$/.test(normalized)) {
    return false;
  }

  try {
    sessionStorage.setItem('stiffin_demo_ref_code', normalized);
    return true;
  } catch {
    // Ignore storage quota or security errors gracefully
    return false;
  }
}

export function getCapturedPrototypeReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem('stiffin_demo_ref_code');
  } catch {
    return null;
  }
}
