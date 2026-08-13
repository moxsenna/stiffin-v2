import { ReferralRepositoryPort } from '@/modules/referrals/ports';
import { LearnerReferralSummary, PromoterReferralOverview } from '@/modules/referrals/types';

const FIXTURE_LEARNER_SUMMARY: LearnerReferralSummary = {
  code: '7X9K4Q',
  shareUrl: 'https://stiffin-promotor-class.moxsenna.workers.dev/p/rina/7-hari-mengenal-cara-belajar-anak?ref=7X9K4Q',
  whatsappShareText:
    'Halo! Saya ikut program edukasi STIFIn di Rina Prameswari. Kamu bisa ikut belajar gratis di link ini: https://stiffin-promotor-class.moxsenna.workers.dev/p/rina/7-hari-mengenal-cara-belajar-anak?ref=7X9K4Q',
  stats: {
    totalInvited: 12,
    engagedCount: 7,
    qualifiedCount: 3,
    rewardsEarned: 3,
  },
  history: [
    {
      id: 'ref_h_1',
      maskedName: 'Budi S••••',
      programTitle: '7 Hari Mengenal Cara Belajar Anak',
      status: 'QUALIFIED',
      rewardStatus: 'ISSUED',
      rewardTitle: 'Akses Bonus: Modul Spesialisasi Parenting',
      createdAt: '2026-08-08T14:30:00Z',
    },
    {
      id: 'ref_h_2',
      maskedName: 'Nina A••••',
      programTitle: '30 Hari Setelah Tes STIFIn',
      status: 'QUALIFIED',
      rewardStatus: 'ISSUED',
      rewardTitle: 'Voucher Diskon 20% Workshop Lanjutan',
      createdAt: '2026-08-05T09:15:00Z',
    },
    {
      id: 'ref_h_3',
      maskedName: 'Doni K••••',
      programTitle: '7 Hari Mengenal Cara Belajar Anak',
      status: 'PENDING',
      rewardStatus: 'PENDING',
      rewardTitle: 'Voucher Diskon 20%',
      createdAt: '2026-08-11T16:45:00Z',
    },
  ],
};

const FIXTURE_PROMOTER_OVERVIEW: PromoterReferralOverview = {
  activeProgram: {
    id: 'ref_prog_2026',
    name: 'Program Referral Ajak Teman 2026',
    status: 'ACTIVE',
    attributionWindowDays: 30,
    rewardHoldDays: 7,
  },
  kpis: {
    totalVisits: 142,
    totalEngaged: 45,
    totalQualified: 18,
    conversionRate: 12.6,
    totalRewardsIssued: 18,
  },
  topReferrers: [
    {
      contactId: 'cnt_ayu',
      name: 'Ayu Prameswari',
      invitedCount: 12,
      engagedCount: 7,
      qualifiedCount: 3,
    },
    {
      contactId: 'cnt_nina',
      name: 'Nina Anjani',
      invitedCount: 9,
      engagedCount: 5,
      qualifiedCount: 2,
    },
    {
      contactId: 'cnt_budi',
      name: 'Budi Santoso',
      invitedCount: 6,
      engagedCount: 3,
      qualifiedCount: 1,
    },
  ],
  auditList: [
    {
      id: 'attr_audit_1',
      referrerName: 'Nina Anjani',
      referredName: 'Doni Kurnia',
      status: 'PENDING',
      riskSignals: ['SAME_SUBNET_HASH'],
      createdAt: '2026-08-12T14:20:00Z',
    },
    {
      id: 'attr_audit_2',
      referrerName: 'Budi Santoso',
      referredName: 'Aria Santoso',
      status: 'QUALIFIED',
      riskSignals: [],
      createdAt: '2026-08-10T11:05:00Z',
    },
  ],
};

export class MockReferralRepository implements ReferralRepositoryPort {
  async getLearnerReferralSummary(_contactId?: string): Promise<LearnerReferralSummary> {
    return FIXTURE_LEARNER_SUMMARY;
  }

  async getPromoterReferralOverview(_workspaceSlug: string): Promise<PromoterReferralOverview> {
    return FIXTURE_PROMOTER_OVERVIEW;
  }
}

export const mockReferralRepository = new MockReferralRepository();
