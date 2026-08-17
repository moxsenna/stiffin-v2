import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
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
import { createActivityRepository } from '../repositories/activity-repository';
import { createBookingRepository } from '../repositories/booking-repository';
import { createAssessmentRepository } from '../repositories/assessment-repository';
import { createContactFlowService } from '../services/contact-flow-service';
import { createNextActionService } from '../services/next-action-service';
import { getNextLocalDay10Am } from '../domain/next-action-rules';

export interface LocalPromotorFlowAdapterOptions {
  context?: OrganizationContext;
  orgTz?: string;
  clock?: () => Date;
}

export class LocalPromotorFlowAdapter implements PromotorFlowAdapter {
  private getNow: () => Date;
  private orgTz: string;

  constructor(
    private db: DbHandle,
    private options: LocalPromotorFlowAdapterOptions = {}
  ) {
    this.getNow = options.clock ?? (() => new Date());
    this.orgTz = options.orgTz ?? DEFAULT_ORGANIZATION_TIMEZONE;
  }

  private resolveContext(explicitCtx?: OrganizationContext, inputOrgId?: string): OrganizationContext {
    if (explicitCtx && isOrganizationContext(explicitCtx)) {
      if (inputOrgId && explicitCtx.organizationId !== inputOrgId) {
        throw new DomainError('FORBIDDEN', 'Organization context mismatch with payload');
      }
      return explicitCtx;
    }

    if (this.options.context && isOrganizationContext(this.options.context)) {
      if (inputOrgId && this.options.context.organizationId !== inputOrgId) {
        throw new DomainError('FORBIDDEN', 'Organization context mismatch with payload');
      }
      return this.options.context;
    }

    if (inputOrgId && typeof inputOrgId === 'string' && inputOrgId.trim().length > 0) {
      return { organizationId: inputOrgId.trim() };
    }

    throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
  }

  /**
   * Returns canonical Flow-owned context for an active, same-organization Contact.
   * Includes: contact identity, stage, sticky classification, interest, primaryNextAction, activeBooking.
   * Fails closed with NOT_FOUND for cross-org, deleted, or nonexistent contacts.
   */
  async getContactContext(contactId: string, ctxOverride?: OrganizationContext): Promise<FlowContactContext> {
    const ctx = this.resolveContext(ctxOverride);
    const flowService = createContactFlowService(this.db, {
      clock: this.getNow,
      orgTz: this.orgTz,
    });

    const context = await flowService.getContactContext(ctx, contactId);

    return {
      contactId: context.contact.id,
      stage: context.stage as FlowContactContext['stage'],
      classification: context.classification as FlowContactContext['classification'],
      primaryNextAction: context.primaryNextAction
        ? {
            id: context.primaryNextAction.id,
            type: context.primaryNextAction.actionType,
            dueAt: context.primaryNextAction.dueAt,
          }
        : undefined,
      activeBooking: context.activeBooking
        ? {
            id: context.activeBooking.id,
            serviceId: context.activeBooking.serviceId,
            startAt: context.activeBooking.startAt,
            status: context.activeBooking.status,
          }
        : undefined,
    };
  }

  /**
   * Reads canonical contact_assessments state.
   * Preserves canonical precedence (COMPLETED > SCHEDULED > CANCELLED > NOT_STARTED).
   * Fails closed for cross-org, deleted, or nonexistent contacts.
   */
  async getAssessmentStatus(contactId: string, ctxOverride?: OrganizationContext): Promise<AssessmentStatus> {
    const ctx = this.resolveContext(ctxOverride);
    const contactRepo = createContactRepository(this.db as any, normalizePhone, normalizeEmail);
    const assessmentRepo = createAssessmentRepository(this.db);

    const contact = await contactRepo.findById(ctx, contactId);
    if (!contact) {
      throw new DomainError('NOT_FOUND', 'Active tenant contact not found');
    }

    const assessment = await assessmentRepo.findById(ctx, contactId);
    if (!assessment) {
      return 'NOT_STARTED';
    }

    return assessment.status as AssessmentStatus;
  }

  /**
   * Accepts canonical Class-origin learning next-action request.
   * Supported action types: FOLLOW_UP (priority 70), MANUAL (priority 40).
   * Fallback for omitted dueAt: next local day at 10:00 AM.
   * Enforces (organization_id, source, idempotency_key) idempotency.
   */
  async createNextAction(
    input: LearningNextActionRequest,
    ctxOverride?: OrganizationContext
  ): Promise<FlowNextActionRef> {
    const parsed = LearningNextActionRequestSchema.parse(input);
    const ctx = this.resolveContext(ctxOverride, parsed.organizationId);

    const now = this.getNow();
    let dueAtIso: string;
    if (parsed.dueAt && parsed.dueAt.trim().length > 0) {
      dueAtIso = new Date(parsed.dueAt).toISOString();
    } else {
      const fallbackDue = getNextLocalDay10Am(now, this.orgTz);
      dueAtIso = fallbackDue.toISOString();
    }

    const priority = parsed.actionType === 'FOLLOW_UP' ? 70 : 40;

    return (this.db as any).transaction(async (tx: DbHandle) => {
      const actionRepo = createNextActionRepository(tx);
      const activityRepo = createActivityRepository(tx);

      // 1. Check idempotency using partial unique key
      const existing = await actionRepo.findByIdempotency(ctx, 'PROMOTORCLASS', parsed.idempotencyKey);
      if (existing) {
        return {
          id: parsed.idempotencyKey,
          contactId: existing.contactId,
          nextActionId: existing.id,
          title: existing.title,
          createdAt: existing.createdAt,
        };
      }

      // 2. Persist canonical Flow next_action
      const created = await actionRepo.create(ctx, {
        contactId: parsed.contactId,
        actionType: parsed.actionType,
        title: parsed.title,
        description: parsed.reason,
        dueAt: dueAtIso,
        priority,
        status: 'PENDING',
        source: 'PROMOTORCLASS',
        sourceEventId: parsed.sourceEventId,
        sourceSignalId: parsed.sourceSignalId ?? null,
        idempotencyKey: parsed.idempotencyKey,
        contextJson: parsed.context as any,
      });

      // 3. Emit ACTION_CREATED activity
      await activityRepo.append(ctx, null, {
        contactId: parsed.contactId,
        eventType: 'ACTION_CREATED',
        metadataJson: {
          actionId: created.id,
          actionType: created.actionType,
          source: 'PROMOTORCLASS',
          sourceEventId: parsed.sourceEventId,
          sourceSignalId: parsed.sourceSignalId ?? null,
          idempotencyKey: parsed.idempotencyKey,
        },
      });

      return {
        id: parsed.idempotencyKey,
        contactId: created.contactId,
        nextActionId: created.id,
        title: created.title,
        createdAt: created.createdAt,
      };
    });
  }

  /**
   * Appends the canonical Flow-owned activity projection for Class learning activity.
   * event_type = 'CLASS_SIGNAL'.
   * Preserves tenant isolation, active Contact validation, and append-only semantics.
   */
  async appendLearningActivity(
    input: LearningActivityProjection,
    ctxOverride?: OrganizationContext
  ): Promise<void> {
    const parsed = LearningActivityProjectionSchema.parse(input);
    const ctx = this.resolveContext(ctxOverride, parsed.organizationId);

    const activityRepo = createActivityRepository(this.db);
    await activityRepo.append(ctx, null, {
      contactId: parsed.contactId,
      eventType: 'CLASS_SIGNAL',
      metadataJson: {
        source: parsed.source,
        sourceEventId: parsed.sourceEventId,
        learningEventType: parsed.eventType,
        summary: parsed.summary,
        context: parsed.context,
        idempotencyKey: parsed.idempotencyKey,
      },
    });
  }
}

export function createLocalPromotorFlowAdapter(
  db: DbHandle,
  options?: LocalPromotorFlowAdapterOptions
): LocalPromotorFlowAdapter {
  return new LocalPromotorFlowAdapter(db, options);
}
