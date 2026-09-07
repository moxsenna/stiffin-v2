// apps/platform-api/src/__tests__/certificate-service.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCertificateService } from '../services/class/certificate-service';
import { DomainError } from '../core/errors';

const now = new Date('2026-09-06T03:00:00Z');

function makeDeps(overrides: Record<string, any> = {}) {
  const created: any[] = [];
  return {
    deps: {
      clock: () => now,
      certRepo: {
        async findByEnrollment(enrollmentId: string) { return created.find((c) => c.enrollmentId === enrollmentId) ?? null; },
        async findBySerial(serial: string) { return created.find((c) => c.serial === serial) ?? null; },
        async create(input: any) { const row = { id: 'cert1', ...input }; created.push(row); return row; },
      },
      enrollmentFinder: {
        async findOwnedEnrollment(_org: string, enrollmentId: string, _contact: string) {
          return overrides.enrollment ?? {
            id: enrollmentId, organizationId: 'o1', contactId: 'c1',
            progressPercent: 100, status: 'COMPLETED',
            contactName: 'Budi Santoso', programTitle: 'Kelas Parenting 101', promoterName: 'Rina',
          };
        },
      },
    },
    created,
  };
}

describe('certificate-service', () => {
  it('menerbitkan sertifikat dengan snapshot data + serial', async () => {
    const { deps, created } = makeDeps();
    const svc = createCertificateService({} as any, deps as any);
    const cert = await svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c1' });
    assert.match(cert.serial, /^RAL-\d{2}-[A-Z0-9]{8}$/);
    assert.equal(cert.recipientName, 'Budi Santoso');
    assert.equal(cert.programTitle, 'Kelas Parenting 101');
    assert.equal(created.length, 1);
  });

  it('idempotent: terbit kedua kali mengembalikan sertifikat yang sama', async () => {
    const { deps } = makeDeps();
    const svc = createCertificateService({} as any, deps as any);
    const a = await svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c1' });
    const b = await svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c1' });
    assert.equal(a.serial, b.serial);
  });

  it('menolak bila progres belum 100%', async () => {
    const { deps } = makeDeps({ enrollment: { id: 'e1', organizationId: 'o1', contactId: 'c1', progressPercent: 60, status: 'STARTED', contactName: 'B', programTitle: 'P', promoterName: 'R' } });
    const svc = createCertificateService({} as any, deps as any);
    await assert.rejects(() => svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c1' }),
      (e: DomainError) => e.code === 'PROGRAM_NOT_COMPLETED');
  });

  it('verifikasi serial tidak dikenal → null', async () => {
    const { deps } = makeDeps();
    const svc = createCertificateService({} as any, deps as any);
    assert.equal(await svc.verifyBySerial('RAL-00-XXXXYYYY'), null);
  });
});
