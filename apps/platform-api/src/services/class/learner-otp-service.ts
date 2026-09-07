import * as crypto from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DomainError } from '../../core/errors';
import { normalizePhone } from '@promotor/platform-core';
import {
  createLearnerOtpRepository,
  type LearnerOtpRepository,
} from '../../repositories/learner-otp-repository';
import { createLearnerSessionRepository } from '../../repositories/learner-session-repository';
import { contacts } from '../../db/schema/contacts';
import { enrollments } from '../../db/schema/enrollments';
import { organizations } from '../../db/schema/organizations';
import type { OtpSender } from './otp-sender';
import { createLogOtpSender } from './otp-sender';

export interface LearnerContactLookup {
  findLearnerByPhone(phoneE164: string): Promise<{
    contactId: string;
    organizationId: string;
    workspaceSlug: string;
    displayName: string;
  } | null>;
}

export interface LearnerOtpDeps {
  clock?: () => Date;
  sender?: OtpSender;
  otpRepo?: LearnerOtpRepository;
  contactFinder?: LearnerContactLookup;
  createSession?: (
    organizationId: string,
    contactId: string
  ) => Promise<{ sessionToken: string }>;
}

export const OTP_TTL_MS = 5 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_REQUEST_LIMIT_WINDOW_MS = 15 * 60_000;
export const OTP_REQUEST_LIMIT = 3;

export function createLearnerOtpService(db: NodePgDatabase, deps: LearnerOtpDeps = {}) {
  const otpRepo = deps.otpRepo ?? createLearnerOtpRepository(db);
  const getNow = deps.clock ?? (() => new Date());
  const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
  const generateCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

  return {
    async requestChallenge(input: { phoneRaw: string }) {
      let phoneE164: string;
      try {
        phoneE164 = normalizePhone(input.phoneRaw);
      } catch {
        throw new DomainError(
          'LEARNER_NOT_FOUND',
          'Nomor WhatsApp tidak terdaftar sebagai peserta. Hubungi promotor Anda.'
        );
      }
      const learner = await (deps.contactFinder ?? createDefaultContactFinder(db)).findLearnerByPhone(
        phoneE164
      );
      if (!learner) {
        throw new DomainError(
          'LEARNER_NOT_FOUND',
          'Nomor WhatsApp tidak terdaftar sebagai peserta. Hubungi promotor Anda.'
        );
      }

      const recent = await otpRepo.countRecentByPhone(
        phoneE164,
        new Date(getNow().getTime() - OTP_REQUEST_LIMIT_WINDOW_MS)
      );
      if (recent >= OTP_REQUEST_LIMIT) {
        throw new DomainError(
          'OTP_RATE_LIMITED',
          'Terlalu banyak permintaan kode. Coba lagi dalam 15 menit.'
        );
      }

      const code = generateCode();
      const expiresAt = new Date(getNow().getTime() + OTP_TTL_MS);
      await otpRepo.createChallenge({
        organizationId: learner.organizationId,
        contactId: learner.contactId,
        phoneE164,
        codeHash: sha256(code),
        expiresAt,
      });
      const sender = deps.sender ?? createDefaultSender();
      try {
        await sender.send(phoneE164, code);
      } catch (err) {
        throw new DomainError(
          'OTP_DELIVERY_UNAVAILABLE',
          'Layanan kode sedang tidak tersedia. Hubungi promotor Anda.'
        );
      }
      return { expiresAt: expiresAt.toISOString(), devCode: code };
    },

    async verifyChallenge(input: { phoneRaw: string; code: string }) {
      let phoneE164: string;
      try {
        phoneE164 = normalizePhone(input.phoneRaw);
      } catch {
        throw new DomainError('OTP_INVALID', 'Kode tidak valid. Minta kode baru.');
      }
      const now = getNow();
      const challenge = await otpRepo.findLatestActiveByPhone(phoneE164);
      if (!challenge) throw new DomainError('OTP_INVALID', 'Kode tidak valid. Minta kode baru.');
      if (new Date(challenge.expiresAt).getTime() < now.getTime()) {
        throw new DomainError('OTP_EXPIRED', 'Kode sudah kedaluwarsa. Minta kode baru.');
      }
      if ((challenge.attempts ?? 0) >= OTP_MAX_ATTEMPTS) {
        throw new DomainError('OTP_EXPIRED', 'Terlalu banyak percobaan. Minta kode baru.');
      }

      const consumed = await otpRepo.atomicConsume(challenge.id, sha256(input.code.trim()), now);
      if (!consumed) {
        const attemptsAfter = (challenge.attempts ?? 0) + 1;
        if (attemptsAfter >= OTP_MAX_ATTEMPTS) {
          throw new DomainError('OTP_EXPIRED', 'Terlalu banyak percobaan. Minta kode baru.');
        }
        throw new DomainError('OTP_INVALID', 'Kode salah. Periksa kembali.');
      }

      const learner = await (deps.contactFinder ?? createDefaultContactFinder(db)).findLearnerByPhone(
        phoneE164
      );
      if (!learner) {
        throw new DomainError(
          'LEARNER_NOT_FOUND',
          'Nomor WhatsApp tidak terdaftar sebagai peserta.'
        );
      }

      const session = await (deps.createSession ?? createDefaultSessionFactory(db))(
        learner.organizationId,
        learner.contactId
      );
      return { sessionToken: session.sessionToken, ...learner };
    },
  };
}

export function createDefaultContactFinder(db: NodePgDatabase): LearnerContactLookup {
  return {
    async findLearnerByPhone(phoneE164: string) {
      const rows = await db
        .select({
          contactId: contacts.id,
          organizationId: contacts.organizationId,
          displayName: contacts.name,
          workspaceSlug: organizations.slug,
          enrolledAt: enrollments.enrolledAt,
        })
        .from(contacts)
        .innerJoin(enrollments, eq(enrollments.contactId, contacts.id))
        .innerJoin(organizations, eq(organizations.id, contacts.organizationId))
        .where(and(eq(contacts.phoneE164, phoneE164), isNull(contacts.deletedAt)))
        .orderBy(desc(enrollments.enrolledAt))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        contactId: row.contactId,
        organizationId: row.organizationId,
        workspaceSlug: row.workspaceSlug,
        displayName: row.displayName,
      };
    },
  };
}

function createDefaultSender(): OtpSender {
  return createLogOtpSender();
}

function createDefaultSessionFactory(db: NodePgDatabase) {
  return async (organizationId: string, contactId: string) => {
    const sessionRepo = createLearnerSessionRepository(db);
    const now = new Date();
    const rawSessionToken = 'lsess_' + crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawSessionToken).digest('hex');
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await sessionRepo.createSession({ organizationId, contactId, tokenHash, expiresAt });
    return { sessionToken: rawSessionToken };
  };
}

export type { OtpSender } from './otp-sender';
