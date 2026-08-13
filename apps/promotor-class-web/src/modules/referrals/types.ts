// DRAFT FOR B4.5. NOT SHARED CONTRACT V1.

export type ReferralProgramStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
export type ReferralQualificationRule = 'REGISTRATION' | 'PROGRAM_COMPLETED' | 'PAID_PURCHASE' | 'ASSESSMENT_COMPLETED';
export type ReferralRewardType = 'BONUS_ACCESS' | 'DISCOUNT_COUPON' | 'COMMISSION';
export type ReferralAttributionStatus = 'PENDING' | 'QUALIFIED' | 'REJECTED' | 'EXPIRED';
export type ReferralConversionStatus = 'ENGAGED' | 'PENDING_QUALIFICATION' | 'QUALIFIED' | 'REVERSED';
export type ReferralRewardStatus = 'PENDING' | 'APPROVED' | 'ISSUED' | 'REDEEMED' | 'CANCELLED';

export interface LearnerReferralHistoryItem {
  id: string;
  maskedName: string;
  programTitle: string;
  status: ReferralAttributionStatus;
  rewardStatus: ReferralRewardStatus;
  rewardTitle: string;
  createdAt: string;
}

export interface LearnerReferralSummary {
  code: string;
  shareUrl: string;
  whatsappShareText: string;
  stats: {
    totalInvited: number;
    engagedCount: number;
    qualifiedCount: number;
    rewardsEarned: number;
  };
  history: LearnerReferralHistoryItem[];
}

export interface TopReferrerItem {
  contactId: string;
  name: string;
  invitedCount: number;
  engagedCount: number;
  qualifiedCount: number;
}

export interface ReferralAuditItem {
  id: string;
  referrerName: string;
  referredName: string;
  status: ReferralAttributionStatus;
  riskSignals: string[];
  createdAt: string;
}

export interface PromoterReferralOverview {
  activeProgram: {
    id: string;
    name: string;
    status: ReferralProgramStatus;
    attributionWindowDays: number;
    rewardHoldDays: number;
  };
  kpis: {
    totalVisits: number;
    totalEngaged: number;
    totalQualified: number;
    conversionRate: number;
    totalRewardsIssued: number;
  };
  topReferrers: TopReferrerItem[];
  auditList: ReferralAuditItem[];
}
