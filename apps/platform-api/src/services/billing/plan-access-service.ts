import {
  TALIRA_PLANS,
  TaliraPlanCode,
  OrganizationPlanAccess,
  PlanUsage,
  PlanLimits,
} from '@promotor/contracts';
import { DomainError } from '../../core/errors';
import { SubscriptionRepository } from '../../repositories/subscription-repository';

export interface PlanAccessService {
  getPlanAccess(organizationId: string): Promise<OrganizationPlanAccess>;
  assertCanPublishProgram(organizationId: string): Promise<void>;
  assertCanUsePaidPrograms(organizationId: string): Promise<void>;
  assertCanCustomizeStorefront(organizationId: string): Promise<void>;
  assertCanAddLearner(organizationId: string): Promise<void>;
  assertCanAddContact(organizationId: string): Promise<void>;
}

export function createPlanAccessService(
  subscriptionRepo: SubscriptionRepository,
  clock: () => Date = () => new Date()
): PlanAccessService {
  return {
    async getPlanAccess(organizationId: string): Promise<OrganizationPlanAccess> {
      const sub = await subscriptionRepo.getSubscription(organizationId);
      const usageRaw = await subscriptionRepo.countUsage(organizationId);

      const planCode = (sub.planCode as TaliraPlanCode) || 'FREE';
      const planDef = TALIRA_PLANS[planCode] ?? TALIRA_PLANS.FREE;

      const now = clock();
      const isPastDue = sub.status === 'PAST_DUE';
      const hasGrace = sub.graceEndsAt ? new Date(sub.graceEndsAt) > now : false;
      const isGracePeriod = sub.status === 'GRACE_PERIOD' || (isPastDue && hasGrace);

      // If subscription is canceled or past-due without grace, fall back to FREE limits for new actions
      const effectivePlan =
        sub.status === 'ACTIVE' || isGracePeriod
          ? planDef
          : TALIRA_PLANS.FREE;

      const usage: PlanUsage = {
        publishedPrograms: usageRaw.publishedPrograms,
        activeLearners: usageRaw.activeLearners,
        contacts: usageRaw.contacts,
      };

      const limits: PlanLimits = {
        maxPublishedPrograms: effectivePlan.maxPublishedPrograms,
        maxActiveLearners: effectivePlan.maxActiveLearners,
        maxContacts: effectivePlan.maxContacts,
        canUsePaidPrograms: effectivePlan.paidPrograms,
        canCustomizeStorefront: effectivePlan.storefrontAdvancedBranding,
        canRemoveTaliraBranding: effectivePlan.removeTaliraBranding,
      };

      return {
        subscription: {
          id: sub.id,
          organizationId: sub.organizationId,
          planCode: sub.planCode as TaliraPlanCode,
          status: sub.status as any,
          billingCycle: sub.billingCycle as any,
          provider: sub.provider as any,
          providerCustomerId: sub.providerCustomerId,
          providerSubscriptionId: sub.providerSubscriptionId,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          graceEndsAt: sub.graceEndsAt,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        },
        plan: effectivePlan,
        usage,
        limits,
        isGracePeriod,
        effectivePaidProgramsAllowed: limits.canUsePaidPrograms,
      };
    },

    async assertCanPublishProgram(organizationId: string): Promise<void> {
      const access = await this.getPlanAccess(organizationId);
      if (access.usage.publishedPrograms >= access.limits.maxPublishedPrograms) {
        throw new DomainError(
          'PLAN_LIMIT_REACHED',
          `Batas program terpublikasi (${access.limits.maxPublishedPrograms}) untuk paket ${access.plan.name} telah tercapai. Tingkatkan paket ke Ralivo Solo untuk mempublikasikan hingga 10 program.`,
          {
            feature: 'publish_program',
            currentPlan: access.plan.code,
            requiredPlan: 'SOLO',
            currentUsage: access.usage.publishedPrograms,
            limit: access.limits.maxPublishedPrograms,
          }
        );
      }
    },

    async assertCanUsePaidPrograms(organizationId: string): Promise<void> {
      const access = await this.getPlanAccess(organizationId);
      if (!access.limits.canUsePaidPrograms) {
        throw new DomainError(
          'FEATURE_REQUIRES_UPGRADE',
          'Penjualan program kelas berbayar hanya tersedia di paket Ralivo Solo. Silakan upgrade paket Anda untuk mengaktifkan fitur ini.',
          {
            feature: 'paid_programs',
            currentPlan: access.plan.code,
            requiredPlan: 'SOLO',
            currentUsage: 0,
            limit: 0,
          }
        );
      }
    },

    async assertCanCustomizeStorefront(organizationId: string): Promise<void> {
      const access = await this.getPlanAccess(organizationId);
      if (!access.limits.canCustomizeStorefront) {
        throw new DomainError(
          'FEATURE_REQUIRES_UPGRADE',
          'Kustomisasi tema dan branding storefront lanjutan hanya tersedia di paket Ralivo Solo.',
          {
            feature: 'storefront_advanced_branding',
            currentPlan: access.plan.code,
            requiredPlan: 'SOLO',
          }
        );
      }
    },

    async assertCanAddLearner(organizationId: string): Promise<void> {
      const access = await this.getPlanAccess(organizationId);
      if (access.usage.activeLearners >= access.limits.maxActiveLearners) {
        throw new DomainError(
          'PLAN_LIMIT_REACHED',
          `Batas kapasitas peserta aktif (${access.limits.maxActiveLearners}) untuk paket ${access.plan.name} telah tercapai. Tingkatkan paket untuk menerima peserta baru.`,
          {
            feature: 'active_learners',
            currentPlan: access.plan.code,
            requiredPlan: 'SOLO',
            currentUsage: access.usage.activeLearners,
            limit: access.limits.maxActiveLearners,
          }
        );
      }
    },

    async assertCanAddContact(organizationId: string): Promise<void> {
      const access = await this.getPlanAccess(organizationId);
      if (access.usage.contacts >= access.limits.maxContacts) {
        throw new DomainError(
          'PLAN_LIMIT_REACHED',
          `Batas kontak CRM (${access.limits.maxContacts}) untuk paket ${access.plan.name} telah tercapai. Tingkatkan paket ke Ralivo Solo untuk mengelola hingga 2.500 kontak.`,
          {
            feature: 'contacts',
            currentPlan: access.plan.code,
            requiredPlan: 'SOLO',
            currentUsage: access.usage.contacts,
            limit: access.limits.maxContacts,
          }
        );
      }
    },
  };
}
