export interface FeatureFlagEnv {
  enableFlag?: string;
  nodeEnv?: string;
}

/**
 * Feature flag helper to gate prototype-only surfaces prior to B4.5 production release.
 */
export function isReferralPrototypeEnabled(env?: FeatureFlagEnv): boolean {
  const flag = env?.enableFlag ?? process.env.NEXT_PUBLIC_ENABLE_REFERRAL_PROTOTYPE;
  const nodeEnv = env?.nodeEnv ?? process.env.NODE_ENV;

  if (flag === 'true') return true;
  if (nodeEnv === 'development') return true;
  return false;
}
