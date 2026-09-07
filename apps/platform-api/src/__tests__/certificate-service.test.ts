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

  it('menolak bila enrollment bukan milik contact (ownership)', async () => {
    const { deps } = makeDeps();
    (deps.enrollmentFinder as any).findOwnedEnrollment = async () => null;
    const svc = createCertificateService({} as any, deps as any);
    // seed sertifikat milik learner lain di enrollment sama
    (deps.certRepo as any).findByEnrollment = async () => ({
      serial: 'RAL-26-OTHER123',
      recipientName: 'Orang Lain',
      programTitle: 'P',
      promoterName: 'R',
      issuedAt: now,
    });
    await assert.rejects(
      () => svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c-att' }),
      (e: DomainError) => e.code === 'NOT_FOUND'
    );
  });

  it('race: create return null → fallback ke sertifikat pemenang', async () => {
    const { deps } = makeDeps();
    const winner = {
      id: 'cert-w', organizationId: 'o1', enrollmentId: 'e1', serial: 'RAL-26-WINNER01',
      recipientName: 'Budi Santoso', programTitle: 'Kelas Parenting 101', promoterName: 'Rina',
      issuedAt: now,
    };
    (deps.certRepo as any).findByEnrollment = async () => null;
    (deps.certRepo as any).create = async () => null;
    let calls = 0;
    const origFind = (deps.certRepo as any).findByEnrollment;
    (deps.certRepo as any).findByEnrollment = async (id: string) => {
      calls += 1;
      if (calls === 1) return origFind(id);
      return winner;
    };
    const svc = createCertificateService({} as any, deps as any);
    const cert = await svc.issueForEnrollment({ organizationId: 'o1', enrollmentId: 'e1', authenticatedContactId: 'c1' });
    assert.equal(cert.serial, 'RAL-26-WINNER01');
  });
});
