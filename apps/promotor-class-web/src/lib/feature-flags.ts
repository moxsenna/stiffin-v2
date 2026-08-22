export interface FeatureFlagEnv {
  enableFlag?: string;
  nodeEnv?: string;
}

/**
 * Feature flag helper to gate prototype-only surfaces prior to production release.
 */
export function isReferralPrototypeEnabled(env?: FeatureFlagEnv): boolean {
  const flag = env?.enableFlag ?? process.env.NEXT_PUBLIC_ENABLE_REFERRAL_PROTOTYPE;
  const nodeEnv = env?.nodeEnv ?? process.env.NODE_ENV;

  if (flag === 'true') return true;
  if (nodeEnv === 'development') return true;
  return false;
}

export function isTemplatesEnabled(env?: FeatureFlagEnv): boolean {
  const flag = env?.enableFlag ?? process.env.NEXT_PUBLIC_ENABLE_TEMPLATES;
  const nodeEnv = env?.nodeEnv ?? process.env.NODE_ENV;

  if (flag === 'true') return true;
  if (nodeEnv === 'development') return true;
  return false;
}
