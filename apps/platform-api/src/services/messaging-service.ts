import type { DbHandle } from '../db/client';
import { isOrganizationContext, type OrganizationContext } from '../core/organization-context';
import type { AuthenticatedActor } from '../auth/types';
import { DomainError } from '../core/errors';
import { normalizePhone, normalizeEmail } from '@promotor/platform-core';
import { createContactRepository } from '../repositories/contact-repository';
import { createActivityRepository } from '../repositories/activity-repository';

export interface BuildWaDeepLinkInput {
  contactId: string;
  message: string;
}

export interface MessagingServiceDependencies {
  contacts?: typeof createContactRepository;
  activities?: typeof createActivityRepository;
}

export function createMessagingService(
  db: DbHandle,
  dependencies: MessagingServiceDependencies = {}
) {
  return {
    /**
     * Builds a WhatsApp deep-link URL (wa.me) for an active tenant contact.
     * Resolves phone_e164 via the declared contacts dependency and records WHATSAPP_OPENED.
     * Note: Opening WhatsApp does NOT mark messages sent (wa.me rule §8.5).
     */
    async buildWaDeepLink(
      ctx: OrganizationContext,
      input: BuildWaDeepLinkInput,
      actor?: AuthenticatedActor | null
    ) {
      if (!isOrganizationContext(ctx)) {
        throw new DomainError('VALIDATION_ERROR', 'Tenant context is required');
      }

      const contactRepo = (dependencies.contacts ?? createContactRepository)(
        db as any,
        normalizePhone,
        normalizeEmail
      );
      const activityRepo = (dependencies.activities ?? createActivityRepository)(db);

      // Org-scoped lookup of active contact (deleted_at IS NULL)
      const contact = await contactRepo.findById(ctx, input.contactId);
      if (!contact) {
        throw new DomainError('NOT_FOUND', 'Active tenant contact not found');
      }

      // Format clean phone digits for wa.me URL (e.g. +62812... -> 62812...)
      const cleanPhone = contact.phoneE164.replace(/\D/g, '');
      const encodedMessage = encodeURIComponent(input.message);
      const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

      // Append WHATSAPP_OPENED activity
      await activityRepo.append(ctx, actor, {
        contactId: input.contactId,
        eventType: 'WHATSAPP_OPENED',
        metadataJson: {
          contactId: input.contactId,
        },
      });

      return {
        url,
        phoneE164: contact.phoneE164,
      };
    },
  };
}
