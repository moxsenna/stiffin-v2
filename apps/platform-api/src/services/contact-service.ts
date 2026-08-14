import { z } from 'zod';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PhoneE164Schema } from '@promotor/contracts';
import { normalizePhone } from '@promotor/platform-core';
import { createContactRepository } from '../repositories/contact-repository';
import { DomainError } from '../core/errors';
import type { OrganizationContext } from '../core/organization-context';

const MatchOrCreateSchema = z.object({
  name: z.string().min(1, 'Contact name cannot be empty').max(200),
  phoneRaw: z.string().min(6).max(30).optional(),
  email: z.string().email('Invalid email').max(320).optional(),
});

export interface MatchOrCreateContactCommand {
  context: OrganizationContext;
  name: string;
  phoneRaw?: string;
  email?: string;
}

export function createContactService(db: NodePgDatabase) {
  const repo = createContactRepository(db, normalizePhone);

  return {
    /**
     * Canonical Shared Core contact matching (INTEGRATION_CONTRACT §10):
     * normalize phone → match organization_id + phone_e164 → reuse contact_id
     * → else create. Database unique constraint is the final guard.
     */
    async matchOrCreateContact(command: MatchOrCreateContactCommand) {
      const parsed = MatchOrCreateSchema.safeParse({
        name: command.name,
        phoneRaw: command.phoneRaw,
        email: command.email,
      });
      if (!parsed.success) {
        throw new DomainError('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input');
      }

      // Normalize and re-validate the canonical E.164 value before persistence.
      let phoneE164: string | undefined;
      if (parsed.data.phoneRaw) {
        try {
          phoneE164 = normalizePhone(parsed.data.phoneRaw);
          PhoneE164Schema.parse(phoneE164);
        } catch {
          throw new DomainError('VALIDATION_ERROR', 'Phone number must be a valid E.164 number');
        }
      }

      return repo.matchOrCreate({
        context: command.context,
        name: parsed.data.name,
        phoneRaw: parsed.data.phoneRaw,
        email: parsed.data.email,
      });
    },

    async findContactByPhone(context: OrganizationContext, phoneRaw: string) {
      let phoneE164: string;
      try {
        phoneE164 = normalizePhone(phoneRaw);
      } catch {
        throw new DomainError('VALIDATION_ERROR', 'Phone number must be a valid E.164 number');
      }
      return repo.findByPhone(context, phoneE164);
    },

    async softDeleteContact(context: OrganizationContext, id: string) {
      const existing = await repo.findById(context, id);
      if (!existing) throw new DomainError('NOT_FOUND', 'Contact not found');
      await repo.softDelete(context, id);
    },
  };
}
