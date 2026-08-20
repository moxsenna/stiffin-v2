import { eq, and, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DomainError } from '../core/errors';
import {
  contacts,
  enrollments,
  learnerSessions,
  learnerAccessTokens,
  reflectionResponses,
  bookings,
  nextActions,
  activities,
} from '../db/schema';

export interface AnonymizeContactResult {
  contactId: string;
  anonymized: boolean;
  occurredAt: string;
}

export interface ContactPrivacyService {
  anonymizeContact(
    organizationId: string,
    contactId: string,
    actorUserId?: string
  ): Promise<AnonymizeContactResult>;
}

export function createContactPrivacyService(db: NodePgDatabase<any>): ContactPrivacyService {
  return {
    async anonymizeContact(
      organizationId: string,
      contactId: string,
      actorUserId?: string
    ): Promise<AnonymizeContactResult> {
      const nowIso = new Date().toISOString();

      // 1. Verify contact exists within organization
      const [existing] = await db
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, organizationId)))
        .limit(1);

      if (!existing) {
        throw new DomainError('NOT_FOUND', 'Kontak tidak ditemukan');
      }

      // Generate a deterministic unique pseudonymized E.164 phone conforming to org phone unique index
      // Format: +62800 + 8 digits derived from contact id (e.g. +6280012345678)
      const sanitizedDigits = contactId.replace(/[^0-9]/g, '').slice(0, 8).padStart(8, '0');
      const pseudonymPhone = `+62800${sanitizedDigits}`;

      // 2. Anonymize PII in contacts table and mark soft deleted
      await db
        .update(contacts)
        .set({
          name: '[ANONIM]',
          phoneE164: pseudonymPhone,
          email: null,
          deletedAt: nowIso,
          updatedAt: nowIso,
        })
        .where(and(eq(contacts.id, contactId), eq(contacts.organizationId, organizationId)));

      // 3. Revoke all active learner sessions and tokens
      await db
        .delete(learnerSessions)
        .where(eq(learnerSessions.contactId, contactId));

      await db
        .delete(learnerAccessTokens)
        .where(eq(learnerAccessTokens.contactId, contactId));

      // 4. Scrub reflection response texts across all enrollments of this contact
      const contactEnrollments = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(and(eq(enrollments.contactId, contactId), eq(enrollments.organizationId, organizationId)));

      if (contactEnrollments.length > 0) {
        const enrollmentIds = contactEnrollments.map((e) => e.id);
        await db
          .update(reflectionResponses)
          .set({
            responseText: '[REDACTED]',
            selectedOptions: null,
          })
          .where(
            and(
              eq(reflectionResponses.organizationId, organizationId),
              inArray(reflectionResponses.enrollmentId, enrollmentIds)
            )
          );
      }

      // 5. Scrub notes from bookings
      await db
        .update(bookings)
        .set({
          notes: null,
          updatedAt: nowIso,
        })
        .where(and(eq(bookings.organizationId, organizationId), eq(bookings.contactId, contactId)));

      // 6. Cancel pending next actions
      await db
        .update(nextActions)
        .set({
          status: 'CANCELLED',
          updatedAt: nowIso,
        })
        .where(
          and(
            eq(nextActions.organizationId, organizationId),
            eq(nextActions.contactId, contactId),
            eq(nextActions.status, 'PENDING')
          )
        );

      // 7. Record immutable audit activity log
      const isValidActorUuid =
        typeof actorUserId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorUserId);
      const safeActorUserId = isValidActorUuid ? actorUserId : null;

      await db.insert(activities).values({
        organizationId,
        contactId,
        eventType: 'CONTACT_UPDATED',
        actorUserId: safeActorUserId,
        metadataJson: {
          anonymized: true,
          policy: 'UU_PDP_GDPR_COMPLIANT',
          requestedAt: nowIso,
        },
        occurredAt: nowIso,
      });

      return {
        contactId,
        anonymized: true,
        occurredAt: nowIso,
      };
    },
  };
}
