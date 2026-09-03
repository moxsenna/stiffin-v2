import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createEnrollmentService } from '../services/class/enrollment-service';
import { DomainError } from '../core/errors';

describe('P1 — Close Paid Program Free-Enrollment Bypass', () => {
  const mockOrg = {
    id: 'org-test-p1',
    slug: 'demo-p1',
    name: 'Demo P1 Org',
    timezone: 'Asia/Jakarta',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const mockPaidProgram = {
    id: 'prog-paid-1',
    organizationId: 'org-test-p1',
    workspaceSlug: 'demo-p1',
    programSlug: 'kelas-komunikasi-berbayar',
    title: 'Kelas Komunikasi Berbayar',
    subtitle: 'Program berbayar',
    description: 'Deskripsi',
    programType: 'paid' as const,
    accessType: 'public' as const,
    status: 'published' as const,
    pricing: 'one_time' as const,
    priceAmount: 199000,
    modules: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  const mockFreeProgram = {
    id: 'prog-free-1',
    organizationId: 'org-test-p1',
    workspaceSlug: 'demo-p1',
    programSlug: 'kelas-gratis',
    title: 'Kelas Pengantar Gratis',
    subtitle: 'Free class',
    description: 'Deskripsi',
    programType: 'lead_magnet' as const,
    accessType: 'public' as const,
    status: 'published' as const,
    pricing: 'free' as const,
    priceAmount: 0,
    modules: [],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };

  it('calling free public registration on a one_time paid program MUST throw PAYMENT_REQUIRED', async () => {
    let contactCreated = false;
    let enrollmentCreated = false;
    let eventAppended = false;
    let tokenCreated = false;

    const mockOrgRepo: any = {
      findBySlug: async (slug: string) => (slug === 'demo-p1' ? mockOrg : null),
    };

    const mockProgramRepo: any = {
      findBySlug: async (_ctx: any, slug: string) => {
        if (slug === 'kelas-komunikasi-berbayar') return mockPaidProgram;
        return null;
      },
    };

    const mockContactRepo: any = {
      findByPhone: async () => null,
      matchOrCreate: async () => {
        contactCreated = true;
        return { id: 'contact-1', organizationId: 'org-test-p1', name: 'Pembeli Ilegal', phoneE164: '+6281234567890', createdAt: '2026-09-01T00:00:00.000Z' };
      },
    };

    const mockEnrollmentRepo: any = {
      findByProgramAndContact: async () => null,
      create: async () => {
        enrollmentCreated = true;
        return {} as any;
      },
    };

    const mockLearningEventRepo: any = {
      create: async () => {
        eventAppended = true;
      },
    };

    const mockLearnerAccessRepo: any = {
      create: async () => {
        tokenCreated = true;
        return {} as any;
      },
    };

    const service = createEnrollmentService({} as any, {
      orgRepo: mockOrgRepo,
      programRepo: mockProgramRepo,
      contactRepo: mockContactRepo,
      enrollmentRepo: mockEnrollmentRepo,
      learningEventRepo: mockLearningEventRepo,
      learnerAccessRepo: mockLearnerAccessRepo,
    });

    await assert.rejects(
      async () => {
        await service.registerPublicLearner({
          slug: 'demo-p1',
          programSlug: 'kelas-komunikasi-berbayar',
          name: 'Pembeli Ilegal',
          phoneRaw: '081234567890',
        });
      },
      (err: any) => {
        assert.ok(err instanceof DomainError, 'Must throw DomainError');
        assert.strictEqual(err.code, 'PAYMENT_REQUIRED');
        assert.strictEqual(err.details?.programId, 'prog-paid-1');
        assert.strictEqual(err.details?.pricing, 'one_time');
        assert.strictEqual(err.details?.priceAmount, 199000);
        return true;
      }
    );

    // Assert zero side-effects
    assert.strictEqual(contactCreated, false, 'MUST NOT create Contact');
    assert.strictEqual(enrollmentCreated, false, 'MUST NOT create Enrollment');
    assert.strictEqual(eventAppended, false, 'MUST NOT emit learner.enrolled');
    assert.strictEqual(tokenCreated, false, 'MUST NOT issue access token');
  });

  it('calling free public registration on a free program succeeds normally', async () => {
    let enrollmentCreated = false;
    let eventAppended = false;

    const mockOrgRepo: any = {
      findBySlug: async (slug: string) => (slug === 'demo-p1' ? mockOrg : null),
    };

    const mockProgramRepo: any = {
      findBySlug: async (_ctx: any, slug: string) => {
        if (slug === 'kelas-gratis') return mockFreeProgram;
        return null;
      },
    };

    const mockContactRepo: any = {
      findByPhone: async () => null,
      matchOrCreate: async () => ({
        id: 'contact-legit',
        organizationId: 'org-test-p1',
        name: 'Siswa Sah',
        phoneE164: '+6281234567890',
        createdAt: '2026-09-01T00:00:00.000Z',
      }),
    };

    const mockEnrollmentRepo: any = {
      findByProgramAndContact: async () => null,
      create: async (data: any) => {
        enrollmentCreated = true;
        return { id: 'enr-1', ...data };
      },
    };

    const mockLearningEventRepo: any = {
      create: async () => {
        eventAppended = true;
      },
    };

    const mockLearnerAccessRepo: any = {
      createToken: async () => ({}),
    };

    const service = createEnrollmentService({} as any, {
      orgRepo: mockOrgRepo,
      programRepo: mockProgramRepo,
      contactRepo: mockContactRepo,
      enrollmentRepo: mockEnrollmentRepo,
      learningEventRepo: mockLearningEventRepo,
      learnerAccessRepo: mockLearnerAccessRepo,
    });

    const result = await service.registerPublicLearner({
      slug: 'demo-p1',
      programSlug: 'kelas-gratis',
      name: 'Siswa Sah',
      phoneRaw: '081234567890',
    });

    assert.strictEqual(result.programId, 'prog-free-1');
    assert.strictEqual(enrollmentCreated, true, 'Enrollment created for free class');
    assert.strictEqual(eventAppended, true, 'Learning event emitted for free class');
    assert.ok(result.accessToken && result.accessToken.length >= 32);
  });
});
