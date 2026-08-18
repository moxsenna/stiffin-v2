import { eq, and, asc } from 'drizzle-orm';
import { availabilityRules, AvailabilityRuleRow } from '../db/schema';
import { isOrganizationContext } from '../core/organization-context';
import type { OrganizationContext } from '../core/organization-context';
import { DomainError } from '../core/errors';
import type { DbHandle } from '../db/client';

export interface WeeklyRuleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface AvailabilityRepository {
  listRules(ctx: OrganizationContext): Promise<AvailabilityRuleRow[]>;
  listActiveByDay(ctx: OrganizationContext, dayOfWeek: number): Promise<AvailabilityRuleRow[]>;
  listActiveByOrgId(organizationId: string): Promise<AvailabilityRuleRow[]>;
  replaceWeeklyRules(ctx: OrganizationContext, rules: WeeklyRuleInput[]): Promise<AvailabilityRuleRow[]>;
}

export function createAvailabilityRepository(db: DbHandle): AvailabilityRepository {
  return {
    async listRules(ctx) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      return db
        .select()
        .from(availabilityRules)
        .where(eq(availabilityRules.organizationId, ctx.organizationId))
        .orderBy(asc(availabilityRules.dayOfWeek), asc(availabilityRules.startTime));
    },

    async listActiveByDay(ctx, dayOfWeek) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }
      return db
        .select()
        .from(availabilityRules)
        .where(
          and(
            eq(availabilityRules.organizationId, ctx.organizationId),
            eq(availabilityRules.dayOfWeek, dayOfWeek),
            eq(availabilityRules.isActive, true)
          )
        )
        .orderBy(asc(availabilityRules.startTime));
    },

    async listActiveByOrgId(organizationId: string) {
      if (!organizationId) {
        throw new DomainError('VALIDATION_ERROR', 'organizationId is required');
      }
      return db
        .select()
        .from(availabilityRules)
        .where(
          and(
            eq(availabilityRules.organizationId, organizationId),
            eq(availabilityRules.isActive, true)
          )
        )
        .orderBy(asc(availabilityRules.dayOfWeek), asc(availabilityRules.startTime));
    },

    async replaceWeeklyRules(ctx, rules) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      // Validate rules before mutation
      const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
      for (const r of rules) {
        if (r.dayOfWeek < 0 || r.dayOfWeek > 6) {
          throw new DomainError('VALIDATION_ERROR', `Invalid dayOfWeek: ${r.dayOfWeek}. Must be 0..6`);
        }
        if (!timeRegex.test(r.startTime) || !timeRegex.test(r.endTime)) {
          throw new DomainError('VALIDATION_ERROR', `Invalid time format: ${r.startTime} - ${r.endTime}. Must be HH:mm`);
        }
        if (r.startTime >= r.endTime) {
          throw new DomainError('VALIDATION_ERROR', `startTime (${r.startTime}) must be earlier than endTime (${r.endTime})`);
        }
      }

      return db.transaction(async (tx) => {
        // 1. Delete existing rules for this organization
        await tx
          .delete(availabilityRules)
          .where(eq(availabilityRules.organizationId, ctx.organizationId));

        if (rules.length === 0) {
          return [];
        }

        // 2. Insert new rules
        const rowsToInsert = rules.map((r) => ({
          organizationId: ctx.organizationId,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
          isActive: r.isActive ?? true,
        }));

        const inserted = await tx
          .insert(availabilityRules)
          .values(rowsToInsert)
          .returning();

        return inserted.sort((a, b) => {
          if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
          return a.startTime.localeCompare(b.startTime);
        });
      });
    },
  };
}
