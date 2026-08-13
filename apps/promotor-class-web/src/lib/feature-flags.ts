/**
 * Feature flag helper to gate prototype-only surfaces prior to B4.5 production release.
 */
export function isReferralPrototypeEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_REFERRAL_PROTOTYPE === 'true') return true;
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}
