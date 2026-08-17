import type { DbHandle } from '../db/client';
import {
  type OrganizationContext,
  isOrganizationContext,
} from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
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
import { createContactFlowService } from '../services/contact-flow-service';
import { createAssessmentService } from '../services/assessment-service';
import { createNextActionService } from '../services/next-action-service';
import { createActivityRepository } from '../repositories/activity-repository';
import { createContactRepository } from '../repositories/contact-repository';
import { normalizePhone, normalizeEmail, DEFAULT_ORGANIZATION_TIMEZONE } from '@promotor/platform-core';

export interface LocalPromotorFlowAdapterOptions {
  ctx?: OrganizationContext;
  actor?: AuthenticatedActor | null;
  clock?: () => Date;
  orgTz?: string;
}

export type PromotorFlowAdapterWithContext = PromotorFlowAdapter & {
  withContext: (ctx: OrganizationContext) => PromotorFlowAdapterWithContext;
};

/**
 * Creates the transport-neutral local Flow adapter over canonical PR5 services.
 * Enforces tenant authority from server-resolved OrganizationContext (never payload).
 */
export function createLocalPromotorFlowAdapter(
  db: DbHandle,
  options: LocalPromotorFlowAdapterOptions = {}
): PromotorFlowAdapterWithContext {
  const boundCtx = options.ctx;
  const boundActor = options.actor ?? null;
  const clock = options.clock ?? (() => new Date());
  const orgTz = options.orgTz ?? DEFAULT_ORGANIZATION_TIMEZONE;

  /**
   * Resolves authoritative OrganizationContext.
   * Fails closed if adapter is unbound.
   * Asserts consistency if payload provides organizationId.
   */
  function getRequiredContext(payloadOrgId?: string): OrganizationContext {
    if (!boundCtx || !isOrganizationContext(boundCtx)) {
      throw new DomainError('UNAUTHORIZED', 'Server-resolved tenant context is required');
    }
    if (payloadOrgId && payloadOrgId !== boundCtx.organizationId) {
      throw new DomainError('FORBIDDEN', 'Payload organizationId does not match bound tenant context');
    }
    return boundCtx;
  }

  const adapter: PromotorFlowAdapterWithContext = {
    /**
     * Returns a new adapter instance bound to the provided OrganizationContext.
     */
    withContext(ctx: OrganizationContext): PromotorFlowAdapterWithContext {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Valid OrganizationContext is required for withContext');
      }
      return createLocalPromotorFlowAdapter(db, {
        ...options,
        ctx,
      });
    },

    /**
     * Resolves Flow contact context by delegating to canonical ContactFlowService.
     * Exposes identity, stage, sticky classification, interest, primaryNextAction, and activeBooking.
     */
    async getContactContext(contactId: string): Promise<FlowContactContext> {
      const ctx = getRequiredContext();
      const contactFlowService = createContactFlowService(db, {
        clock,
        orgTz,
      });

      const res = await contactFlowService.getContactContext(ctx, contactId);

      return {
        contactId: res.contact.id,
        stage: res.stage as FlowContactContext['stage'],
        classification: res.classification as FlowContactContext['classification'],
        interest: res.interest ?? null,
        primaryNextAction: res.primaryNextAction
          ? {
              id: res.primaryNextAction.id,
              type: res.primaryNextAction.actionType,
              dueAt: res.primaryNextAction.dueAt,
            }
          : undefined,
        activeBooking: res.activeBooking
          ? {
              id: res.activeBooking.id,
              serviceId: res.activeBooking.serviceId,
              startAt: res.activeBooking.startAt,
              status: res.activeBooking.status,
            }
          : undefined,
      };
    },

    /**
     * Resolves canonical assessment status by delegating to AssessmentService.
     * Fails closed with NOT_FOUND on missing/cross-tenant contacts.
     */
    async getAssessmentStatus(contactId: string): Promise<AssessmentStatus> {
      const ctx = getRequiredContext();
      const assessmentService = createAssessmentService(db);
      const assessment = await assessmentService.getAssessmentStatus(ctx, contactId);
      return assessment.status as AssessmentStatus;
    },

    /**
     * Creates a NextAction from a Class learning signal.
     * Delegates to NextActionService.createClassNextAction with race-safe idempotency.
     */
    async createNextAction(input: LearningNextActionRequest): Promise<FlowNextActionRef> {
      const parsed = LearningNextActionRequestSchema.safeParse(input);
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', `Invalid LearningNextActionRequest: ${parsed.error.message}`);
      }

      const validated = parsed.data;
      const ctx = getRequiredContext(validated.organizationId);

      const nextActionService = createNextActionService(db, {
        clock,
        orgTz,
      });

      const action = await nextActionService.createClassNextAction(ctx, validated, boundActor);

      return {
        id: action.idempotencyKey ?? action.id,
        contactId: action.contactId,
        nextActionId: action.id,
        title: action.title,
        createdAt: new Date(action.createdAt).toISOString(),
      };
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
      const ctx = getRequiredContext(validated.organizationId);

      // Verify active tenant contact parent
      const contactRepo = createContactRepository(db as any, normalizePhone, normalizeEmail);
      const contact = await contactRepo.findById(ctx, validated.contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Active tenant contact is required to append learning activity');
      }

      const activityRepo = createActivityRepository(db);
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
