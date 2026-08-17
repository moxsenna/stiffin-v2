import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
import { DEFAULT_ORGANIZATION_TIMEZONE, normalizePhone, normalizeEmail } from '@promotor/platform-core';
import {
  type PromotorFlowAdapter,
  type FlowContactContext,
  type AssessmentStatus,
  type LearningNextActionRequest,
  type FlowNextActionRef,
  type LearningActivityProjection,
  LearningNextActionRequestSchema,
  LearningActivityProjectionSchema,
} from '@promotor/contracts';
import { createContactRepository } from '../repositories/contact-repository';
import { createContactFlowRepository } from '../repositories/contact-flow-repository';
import { createNextActionRepository } from '../repositories/next-action-repository';
import { createBookingRepository } from '../repositories/booking-repository';
import { createAssessmentRepository } from '../repositories/assessment-repository';
import { createActivityRepository } from '../repositories/activity-repository';
import { getNextLocalDay10Am } from '../domain/next-action-rules';
import { selectPrimaryAction } from '../domain/priority';

export interface LocalPromotorFlowAdapterDependencies {
  contacts?: typeof createContactRepository;
  flowContacts?: typeof createContactFlowRepository;
  nextActions?: typeof createNextActionRepository;
  bookings?: typeof createBookingRepository;
  assessments?: typeof createAssessmentRepository;
  activities?: typeof createActivityRepository;
  clock?: () => Date;
  orgTz?: string;
}

export interface LocalPromotorFlowAdapterOptions extends LocalPromotorFlowAdapterDependencies {
  ctx?: OrganizationContext;
  actor?: AuthenticatedActor | null;
}

export interface LocalPromotorFlowAdapter extends PromotorFlowAdapter {
  withContext(ctx: OrganizationContext, actor?: AuthenticatedActor | null): LocalPromotorFlowAdapter;
}

/**
 * Creates the transport-neutral Flow-side Class integration adapter.
 * Implements the PromotorFlowAdapter contract (§12) over frozen domain repositories and rules.
 */
export function createLocalPromotorFlowAdapter(
  db: DbHandle,
  options: LocalPromotorFlowAdapterOptions = {}
): LocalPromotorFlowAdapter {
  const getNow = options.clock ?? (() => new Date());
  const orgTz = options.orgTz ?? DEFAULT_ORGANIZATION_TIMEZONE;
  const boundCtx = options.ctx;
  const boundActor = options.actor;

  const contactRepoFactory = options.contacts ?? createContactRepository;
  const flowContactRepoFactory = options.flowContacts ?? createContactFlowRepository;
  const nextActionRepoFactory = options.nextActions ?? createNextActionRepository;
  const bookingRepoFactory = options.bookings ?? createBookingRepository;
  const assessmentRepoFactory = options.assessments ?? createAssessmentRepository;
  const activityRepoFactory = options.activities ?? createActivityRepository;

  function resolveContext(explicitOrgId?: string): OrganizationContext {
    if (boundCtx && isOrganizationContext(boundCtx)) {
      if (explicitOrgId && boundCtx.organizationId !== explicitOrgId) {
        throw new DomainError('FORBIDDEN', 'Cross-organization context mismatch');
      }
      return boundCtx;
    }
    if (explicitOrgId) {
      return { organizationId: explicitOrgId };
    }
    throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
  }

  const adapter: LocalPromotorFlowAdapter = {
    withContext(ctx: OrganizationContext, actor?: AuthenticatedActor | null) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      return createLocalPromotorFlowAdapter(db, {
        ...options,
        ctx,
        actor: actor !== undefined ? actor : boundActor,
      });
    },

    /**
     * Reads canonical Flow contact context (stage, classification, primary next action, active booking).
     * Validates active tenant contact (deleted or cross-org fails closed with NOT_FOUND).
     */
    async getContactContext(contactId: string): Promise<FlowContactContext> {
      const ctx = resolveContext();
      const contactRepo = contactRepoFactory(db as any, normalizePhone, normalizeEmail);
      const contact = await contactRepo.findById(ctx, contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Active tenant contact is required');
      }

      const flowContactRepo = flowContactRepoFactory(db);
      const flowState = await flowContactRepo.findById(ctx, contactId);
      const stage = (flowState?.stage ?? 'NEW') as FlowContactContext['stage'];
      const classification = (flowState?.classification ?? 'PROSPECT') as FlowContactContext['classification'];

      const now = getNow();
      const nextActionRepo = nextActionRepoFactory(db);
      const pendingActions = await nextActionRepo.listByContact(ctx, contactId, 'PENDING');
      const primaryAction = selectPrimaryAction(pendingActions, now);

      const bookingRepo = bookingRepoFactory(db);
      const contactBookings = await bookingRepo.listByContact(ctx, contactId);
      // Active booking: earliest upcoming or current non-terminal booking
      const activeBookings = contactBookings
        .filter((b) => b.status === 'PENDING' || b.status === 'CONFIRMED')
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      const activeBookingRow = activeBookings[0] ?? null;

      return {
        contactId: contact.id,
        stage,
        classification,
        ...(primaryAction
          ? {
              primaryNextAction: {
                id: primaryAction.id,
                type: primaryAction.actionType,
                dueAt: primaryAction.dueAt ? new Date(primaryAction.dueAt).toISOString() : null,
              },
            }
          : {}),
        ...(activeBookingRow
          ? {
              activeBooking: {
                id: activeBookingRow.id,
                serviceId: activeBookingRow.serviceId,
                startAt: new Date(activeBookingRow.startAt).toISOString(),
                status: activeBookingRow.status,
              },
            }
          : {}),
      };
    },

    /**
     * Reads canonical assessment record status for a contact.
     * Returns UNKNOWN if contact is missing/deleted, or the canonical status (NOT_STARTED, SCHEDULED, COMPLETED, CANCELLED).
     */
    async getAssessmentStatus(contactId: string): Promise<AssessmentStatus> {
      const ctx = resolveContext();
      const contactRepo = contactRepoFactory(db as any, normalizePhone, normalizeEmail);
      const contact = await contactRepo.findById(ctx, contactId);
      if (!contact) {
        return 'UNKNOWN';
      }

      const assessmentRepo = assessmentRepoFactory(db);
      const assessment = await assessmentRepo.findById(ctx, contactId);
      if (!assessment) {
        return 'NOT_STARTED';
      }

      return assessment.status as AssessmentStatus;
    },

    /**
     * Creates a NextAction from a PromotorClass learning signal/request.
     * Validates input schema, handles optional dueAt with deterministic next local day 10:00 fallback,
     * enforces partial unique idempotency, and emits ACTION_CREATED activity.
     */
    async createNextAction(input: LearningNextActionRequest): Promise<FlowNextActionRef> {
      const parsed = LearningNextActionRequestSchema.safeParse(input);
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', `Invalid LearningNextActionRequest: ${parsed.error.message}`);
      }

      const validated = parsed.data;
      const ctx = resolveContext(validated.organizationId);

      // Verify active tenant contact parent
      const contactRepo = contactRepoFactory(db as any, normalizePhone, normalizeEmail);
      const contact = await contactRepo.findById(ctx, validated.contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Active tenant contact is required to create a next action');
      }

      // Check idempotency before opening transaction
      const actionRepo = nextActionRepoFactory(db);
      const existing = await actionRepo.findByIdempotency(ctx, 'PROMOTORCLASS', validated.idempotencyKey);
      if (existing) {
        return {
          id: existing.idempotencyKey ?? existing.id,
          contactId: existing.contactId,
          nextActionId: existing.id,
          title: existing.title,
          createdAt: new Date(existing.createdAt).toISOString(),
        };
      }

      // Determine dueAt and priority
      const now = getNow();
      let dueAtDate: Date;
      if (validated.dueAt) {
        dueAtDate = new Date(validated.dueAt);
        if (isNaN(dueAtDate.getTime())) {
          throw new DomainError('VALIDATION_ERROR', 'Invalid dueAt timestamp');
        }
      } else {
        dueAtDate = getNextLocalDay10Am(now, orgTz);
      }

      const priority = validated.actionType === 'FOLLOW_UP' ? 70 : 40;

      return await (db as any).transaction(async (tx: DbHandle) => {
        const txActionRepo = nextActionRepoFactory(tx);
        const txActivityRepo = activityRepoFactory(tx);

        // Second idempotency check inside transaction
        const txExisting = await txActionRepo.findByIdempotency(ctx, 'PROMOTORCLASS', validated.idempotencyKey);
        if (txExisting) {
          return {
            id: txExisting.idempotencyKey ?? txExisting.id,
            contactId: txExisting.contactId,
            nextActionId: txExisting.id,
            title: txExisting.title,
            createdAt: new Date(txExisting.createdAt).toISOString(),
          };
        }

        const newAction = await txActionRepo.create(ctx, {
          contactId: validated.contactId,
          actionType: validated.actionType,
          title: validated.title,
          description: validated.reason ?? null,
          dueAt: dueAtDate.toISOString(),
          priority,
          status: 'PENDING',
          source: 'PROMOTORCLASS',
          sourceEventId: validated.sourceEventId ?? null,
          sourceSignalId: validated.sourceSignalId ?? null,
          idempotencyKey: validated.idempotencyKey,
          contextJson: validated.context ? (validated.context as Record<string, unknown>) : null,
        });

        await txActivityRepo.append(ctx, boundActor, {
          contactId: validated.contactId,
          eventType: 'ACTION_CREATED',
          metadataJson: {
            actionId: newAction.id,
            actionType: newAction.actionType,
            source: 'PROMOTORCLASS',
            sourceEventId: validated.sourceEventId,
            sourceSignalId: validated.sourceSignalId,
            idempotencyKey: validated.idempotencyKey,
          },
        });

        return {
          id: validated.idempotencyKey,
          contactId: newAction.contactId,
          nextActionId: newAction.id,
          title: newAction.title,
          createdAt: new Date(newAction.createdAt).toISOString(),
        };
      });
    },

    /**
     * Appends a Flow-owned activity projection for a Class learning event (CLASS_SIGNAL).
     * Validates input schema, active tenant contact, and append-only activity invariant.
     */
    async appendLearningActivity(input: LearningActivityProjection): Promise<void> {
      const parsed = LearningActivityProjectionSchema.safeParse(input);
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', `Invalid LearningActivityProjection: ${parsed.error.message}`);
      }

      const validated = parsed.data;
      const ctx = resolveContext(validated.organizationId);

      // Verify active tenant contact parent
      const contactRepo = contactRepoFactory(db as any, normalizePhone, normalizeEmail);
      const contact = await contactRepo.findById(ctx, validated.contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Active tenant contact is required to append learning activity');
      }

      const activityRepo = activityRepoFactory(db);
      await activityRepo.append(ctx, boundActor, {
        contactId: validated.contactId,
        eventType: 'CLASS_SIGNAL',
        metadataJson: {
          source: 'PROMOTORCLASS',
          sourceEventId: validated.sourceEventId,
          classEventType: validated.eventType,
          summary: validated.summary,
          context: validated.context,
          idempotencyKey: validated.idempotencyKey,
        },
      });
    },
  };

  return adapter;
}
