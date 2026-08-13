import { mockReferralRepository } from '@/adapters/mock/referral-repository';
import { LearnerReferralSummary, PromoterReferralOverview } from './types';

export async function getLearnerReferralSummaryQuery(contactId?: string): Promise<LearnerReferralSummary> {
  return mockReferralRepository.getLearnerReferralSummary(contactId);
}

export async function getPromoterReferralOverviewQuery(workspaceSlug: string): Promise<PromoterReferralOverview> {
  return mockReferralRepository.getPromoterReferralOverview(workspaceSlug);
}
