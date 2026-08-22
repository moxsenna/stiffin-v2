import { getReferralRepository } from '@/adapters';
import { LearnerReferralSummary, PromoterReferralOverview } from './types';

export async function getLearnerReferralSummaryQuery(contactId?: string): Promise<LearnerReferralSummary> {
  return getReferralRepository().getLearnerReferralSummary(contactId);
}

export async function getPromoterReferralOverviewQuery(workspaceSlug: string): Promise<PromoterReferralOverview> {
  return getReferralRepository().getPromoterReferralOverview(workspaceSlug);
}
