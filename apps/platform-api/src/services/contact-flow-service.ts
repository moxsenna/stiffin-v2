import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { createContactService } from './contact-service';
import { createContactRepository } from '../repositories/contact-repository';
import { createContactFlowRepository } from '../repositories/contact-flow-repository';
import { createNextActionRepository } from '../repositories/next-action-repository';
import { createActivityRepository } from '../repositories/activity-repository';
import { createAssessmentRepository } from '../repositories/assessment-repository';
import { createBookingRepository } from '../repositories/booking-repository';
import { createContactLifecycleService } from './contact-lifecycle-service';
import { createNextActionService } from './next-action-service';
import { calculateContactLeadRule } from '../domain/next-action-rules';

export interface CreateFlowContactInput {
  name: string;
  phoneRaw: string;
  interest: string;
  email?: string | null;
  sourceChannel?: string | null;
  notes?: string | null;
}

export interface UpdateFlowProfileInput {
  sourceChannel?: string | null;
  notes?: string | null;
  interest?: string | null;
}

export interface ContactFlowServiceDependencies {
  contactService?: ReturnType<typeof createContactService>;
  lifecycle?: typeof createContactLifecycleService;
  nextActions?: typeof createNextActionService;
  activities?: typeof createActivityRepository;
  contacts?: typeof createContactRepository;
  clock?: () => Date;
  orgTz?: string;
}

export function createContactFlowService(
  db: DbHandle,
  dependencies: ContactFlowServiceDependencies = {}
) {
  const getNow = dependencies.clock ?? (() => new Date());

  return {
    /**
     * Creates a new Flow Contact with two-phase onboarding:
     * - Phase 1: Shared Core match-or-create Contact (durable canonical identity).
     * - Phase 2: Flow onboarding transaction (flow state, NA-001 CONTACT_LEAD, CONTACT_CREATED activity).
     *
     * Flow-created contact strictly requires a non-empty interest string.
     */
    async createFlowContact(
      ctx: OrganizationContext,
      input: CreateFlowContactInput,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      // Validate non-empty interest for Flow contact creation
      if (!input.interest || input.interest.trim().length === 0) {
        throw new DomainError('VALIDATION_ERROR', 'INTEREST_REQUIRED');
      }

      const trimmedInterest = input.interest.trim();

      // Phase 1: Canonical Shared Core match-or-create Contact
      const coreContactService =
        dependencies.contactService ?? createContactService(db as any);

      const contact = await coreContactService.matchOrCreateContact({
        context: ctx,
        name: input.name,
        phoneRaw: input.phoneRaw,
        email: input.email ?? undefined,
      });

      // Phase 2: Flow-owned onboarding inside a transaction
      const now = getNow();
      const leadRule = calculateContactLeadRule(now);

      const phase2Result = await (db as any).transaction(async (tx: DbHandle) => {
        const flowRepo = createContactFlowRepository(tx);
        const nextActionService = (dependencies.nextActions ?? createNextActionService)(tx, {
          activities: dependencies.activities,
          clock: () => now,
          orgTz: dependencies.orgTz,
        });
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        // 1. Get or create contact_flow_state
        const existingState = await flowRepo.getOrCreate(ctx, contact.id);
        if (!existingState) {
          throw new DomainError('NOT_FOUND', 'Failed to initialize contact flow state');
        }

        // 2. Persist Flow profile details (interest, sourceChannel, notes)
        const updatedState = await flowRepo.updateProfile(ctx, contact.id, {
          interest: trimmedInterest,
          sourceChannel: input.sourceChannel ?? null,
          notes: input.notes ?? null,
        });

        // 3. Provision NA-001 CONTACT_LEAD via canonical NextActionService engine
        const leadAction = await nextActionService.createContactLeadAction(
          ctx,
          {
            contactId: contact.id,
            interest: trimmedInterest,
            sourceChannel: input.sourceChannel ?? null,
            notes: input.notes ?? null,
          },
          actor
        );

        // 4. Append CONTACT_CREATED activity
        await activityRepo.append(ctx, actor, {
          contactId: contact.id,
          eventType: 'CONTACT_CREATED',
          metadataJson: {
            interest: trimmedInterest,
            sourceChannel: input.sourceChannel ?? null,
          },
        });

        return {
          flowState: updatedState ?? existingState,
          leadAction,
        };
      });

      return {
        contact,
        flowState: phase2Result.flowState,
        leadAction: phase2Result.leadAction,
      };
    },

    /**
     * Updates Flow profile fields (sourceChannel, notes, interest) and emits CONTACT_UPDATED.
     */
    async updateProfile(
      ctx: OrganizationContext,
      contactId: string,
      patch: UpdateFlowProfileInput,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      return (db as any).transaction(async (tx: DbHandle) => {
        const flowRepo = createContactFlowRepository(tx);
        const activityRepo = (dependencies.activities ?? createActivityRepository)(tx);

        const existing = await flowRepo.getOrCreate(ctx, contactId);
        if (!existing) {
          throw new DomainError('NOT_FOUND', 'Active tenant contact not found');
        }

        const updated = await flowRepo.updateProfile(ctx, contactId, {
          sourceChannel: patch.sourceChannel,
          notes: patch.notes,
          interest: patch.interest !== undefined ? patch.interest?.trim() ?? null : undefined,
        });

        await activityRepo.append(ctx, actor, {
          contactId,
          eventType: 'CONTACT_UPDATED',
          metadataJson: {
            sourceChannel: patch.sourceChannel,
            notes: patch.notes,
            interest: patch.interest,
          },
        });

        return updated ?? existing;
      });
    },

    /**
     * Reads canonical Flow contact context per integration contract §14.
     */
    async getContactContext(ctx: OrganizationContext, contactId: string) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const contactRepo = (dependencies.contacts ?? createContactRepository)(
        db as any,
        normalizePhone,
        normalizeEmail
      );
      const flowRepo = createContactFlowRepository(db);
      const actionService = (dependencies.nextActions ?? createNextActionService)(db, {
        activities: dependencies.activities,
        clock: dependencies.clock,
        orgTz: dependencies.orgTz,
      });
      const bookingRepo = createBookingRepository(db);

      const contact = await contactRepo.findById(ctx, contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Active tenant contact not found');
      }

      const flowState = await flowRepo.getOrCreate(ctx, contactId);
      if (!flowState) {
        throw new DomainError('NOT_FOUND', 'Contact flow state not found');
      }

      const primaryNextAction = await actionService.getPrimaryNextAction(ctx, contactId);

      // Find earliest active booking (PENDING or CONFIRMED)
      const contactBookings = await bookingRepo.listByContact(ctx, contactId);
      const activeBooking =
        contactBookings
          .filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED')
          .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())[0] ?? null;

      return {
        contact,
        flowState,
        stage: flowState.stage,
        classification: flowState.classification,
        interest: flowState.interest,
        primaryNextAction,
        activeBooking,
      };
    },

    /**
     * Reads canonical assessment record (get-or-create).
     */
    async getAssessmentStatus(ctx: OrganizationContext, contactId: string) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const assessmentRepo = createAssessmentRepository(db);
      const assessment = await assessmentRepo.getOrCreate(ctx, contactId);
      if (!assessment) {
        throw new DomainError('NOT_FOUND', 'Active tenant contact not found');
      }
      return assessment;
    },

    /**
     * Reads timeline activities for a contact.
     */
    async getContactTimeline(ctx: OrganizationContext, contactId: string, limit = 100) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const activityRepo = (dependencies.activities ?? createActivityRepository)(db);
      return activityRepo.listByContact(ctx, contactId, limit);
    },
  };
}
