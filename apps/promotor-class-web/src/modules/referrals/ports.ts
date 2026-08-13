import { LearnerReferralSummary, PromoterReferralOverview } from './types';

export interface ReferralRepositoryPort {
  getLearnerReferralSummary(contactId?: string): Promise<LearnerReferralSummary>;
  getPromoterReferralOverview(workspaceSlug: string): Promise<PromoterReferralOverview>;
}
