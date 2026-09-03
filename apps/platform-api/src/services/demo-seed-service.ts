import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql, isNull, inArray } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { hashPassword } from '@better-auth/utils/password';

import {
  organizations,
  users,
  accounts,
  organizationMembers,
  productEntitlements,
  workspaceProfiles,
  programs,
  programPresentations,
  modules,
  lessons,
  contacts,
  contactFlowStates,
  enrollments,
  lessonProgress,
  reflectionResponses,
  learningEvents,
  learningSignals,
  learnerAccessTokens,
  learnerSessions,
  services,
  availabilityRules,
  messageTemplates,
  bookings,
  nextActions,
  activities,
  aftercareRecords,
  integrationOutbox,
  storefrontThemes,
} from '../db/schema';

export function assertStagingEnvironment(): void {
  const appEnv = (typeof process !== 'undefined' && process.env?.APP_ENV) || 'staging';
  const allowSeed = (typeof process !== 'undefined' && process.env?.ALLOW_DEMO_SEED) || 'true';

  if (appEnv === 'production' && allowSeed !== 'true') {
    throw new Error('[SEED SAFETY] BLOCKED: ALLOW_DEMO_SEED must be explicitly true.');
  }
}

export const DEMO_IDS = {
  organization: 'a0000000-0000-4000-8000-000000000001',
  entitlementId: 'a0000000-0000-4000-8000-00000000000e',
  promoterUser: 'a0000000-0000-4000-8000-000000000002',
  promoterAccount: 'a0000000-0000-4000-8000-000000000003',
  promoterMembership: 'a0000000-0000-4000-8000-000000000004',
  workspaceProfile: 'a0000000-0000-4000-8000-000000000005',

  programA: 'b0000000-0000-4000-8000-000000000001',
  programB: 'b0000000-0000-4000-8000-000000000002',
  programC: 'b0000000-0000-4000-8000-000000000003',
  programD: 'b0000000-0000-4000-8000-000000000004',

  modA1: 'c0000000-0000-4000-8000-000000000001',
  modA2: 'c0000000-0000-4000-8000-000000000002',
  modB1: 'c0000000-0000-4000-8000-000000000003',
  modB2: 'c0000000-0000-4000-8000-000000000004',
  modB3: 'c0000000-0000-4000-8000-000000000005',
  modC1: 'c0000000-0000-4000-8000-000000000006',
  modC2: 'c0000000-0000-4000-8000-000000000007',
  modD1: 'c0000000-0000-4000-8000-000000000008',

  lesA1: 'd0000000-0000-4000-8000-000000000001',
  lesA2: 'd0000000-0000-4000-8000-000000000002',
  lesA3: 'd0000000-0000-4000-8000-000000000003',
  lesA4: 'd0000000-0000-4000-8000-000000000004',
  lesA5: 'd0000000-0000-4000-8000-000000000005',
  lesA6: 'd0000000-0000-4000-8000-000000000006',

  lesB1: 'd0000000-0000-4000-8000-000000000007',
  lesB2: 'd0000000-0000-4000-8000-000000000008',
  lesB3: 'd0000000-0000-4000-8000-000000000009',
  lesB4: 'd0000000-0000-4000-8000-000000000010',
  lesB5: 'd0000000-0000-4000-8000-000000000011',
  lesB6: 'd0000000-0000-4000-8000-000000000012',
  lesB7: 'd0000000-0000-4000-8000-000000000013',
  lesB8: 'd0000000-0000-4000-8000-000000000014',

  lesC1: 'd0000000-0000-4000-8000-000000000015',
  lesC2: 'd0000000-0000-4000-8000-000000000016',
  lesC3: 'd0000000-0000-4000-8000-000000000017',
  lesC4: 'd0000000-0000-4000-8000-000000000018',

  lesD1: 'd0000000-0000-4000-8000-000000000019',
  lesD2: 'd0000000-0000-4000-8000-000000000020',

  contactAyu: 'e0000000-0000-4000-8000-000000000001',
  contactRatna: 'e0000000-0000-4000-8000-000000000002',
  contactBimo: 'e0000000-0000-4000-8000-000000000003',
  contactRani: 'e0000000-0000-4000-8000-000000000004',
  contactSiti: 'e0000000-0000-4000-8000-000000000005',
  contactArief: 'e0000000-0000-4000-8000-000000000006',
  contactDimas: 'e0000000-0000-4000-8000-000000000007',
  contactHendra: 'e0000000-0000-4000-8000-000000000008',
  contactSinta: 'e0000000-0000-4000-8000-000000000009',

  enrAyuA: 'e1000000-0000-4000-8000-000000000001',
  enrAyuB: 'e1000000-0000-4000-8000-000000000002',
  enrAyuC: 'e1000000-0000-4000-8000-000000000003',
  enrRatnaB: 'e1000000-0000-4000-8000-000000000004',
  enrBimoA: 'e1000000-0000-4000-8000-000000000005',
  enrRaniA: 'e1000000-0000-4000-8000-000000000006',
  enrSitiC: 'e1000000-0000-4000-8000-000000000007',
  enrAriefB: 'e1000000-0000-4000-8000-000000000008',

  svcPersonal: 'f0000000-0000-4000-8000-000000000001',
  svcFamily: 'f0000000-0000-4000-8000-000000000002',
  svcCounseling: 'f0000000-0000-4000-8000-000000000003',

  bookingDimas: '90000000-0000-4000-8000-000000000001',
  bookingArief: '90000000-0000-4000-8000-000000000002',
  bookingSinta: '90000000-0000-4000-8000-000000000003',
};

export interface SeedStagingOptions {
  anchorDate?: Date;
  promoterEmail?: string;
  promoterPassword?: string;
  learnerSecret?: string;
}

export async function seedStagingDemo(db: NodePgDatabase, options: SeedStagingOptions = {}) {
  assertStagingEnvironment();

  const now = options.anchorDate || new Date();
  const nowIso = now.toISOString();

  const promoterEmail = (options.promoterEmail || 'demo.promotor@stifin.id').toLowerCase().trim();
  const promoterPassword = options.promoterPassword || 'DemoPromotor123!';
  const learnerSecret = options.learnerSecret || 'demo-ayu-rahma-token-secret-2026';

  // 1. Organization & Entitlements
  const [existingOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, 'demo-promotor'))
    .limit(1);

  const orgId = existingOrg ? existingOrg.id : DEMO_IDS.organization;

  if (!existingOrg) {
    await db.insert(organizations).values({
      id: DEMO_IDS.organization,
      name: 'Demo Promotor STIFIn',
      slug: 'demo-promotor',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  } else {
    await db
      .update(organizations)
      .set({
        name: 'Demo Promotor STIFIn',
        slug: 'demo-promotor',
        updatedAt: nowIso,
      })
      .where(eq(organizations.id, existingOrg.id));
  }

  const [existingEnt] = await db
    .select()
    .from(productEntitlements)
    .where(eq(productEntitlements.organizationId, orgId))
    .limit(1);

  if (existingEnt) {
    await db
      .update(productEntitlements)
      .set({
        promotorClass: true,
        promotorFlow: true,
        updatedAt: nowIso,
      })
      .where(eq(productEntitlements.organizationId, orgId));
  } else {
    await db.insert(productEntitlements).values({
      id: DEMO_IDS.entitlementId,
      organizationId: orgId,
      promotorClass: true,
      promotorFlow: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // 2. Promoter User & Better Auth Account
  const passwordHash = await hashPassword(promoterPassword);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, promoterEmail))
    .limit(1);

  const promoterUserId = existingUser ? existingUser.id : DEMO_IDS.promoterUser;

  if (!existingUser) {
    await db.insert(users).values({
      id: DEMO_IDS.promoterUser,
      name: 'Rina Handayani',
      email: promoterEmail,
      emailVerified: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  } else {
    await db
      .update(users)
      .set({
        name: 'Rina Handayani',
        emailVerified: true,
        updatedAt: nowIso,
      })
      .where(eq(users.id, existingUser.id));
  }

  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, promoterUserId))
    .limit(1);

  if (existingAccount) {
    await db
      .update(accounts)
      .set({
        password: passwordHash,
        updatedAt: now,
      })
      .where(eq(accounts.id, existingAccount.id));
  } else {
    await db.insert(accounts).values({
      id: DEMO_IDS.promoterAccount,
      userId: promoterUserId,
      accountId: promoterUserId,
      providerId: 'credential',
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Membership
  const [existingMember] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, promoterUserId)
      )
    )
    .limit(1);

  if (existingMember) {
    await db
      .update(organizationMembers)
      .set({ role: 'owner' })
      .where(eq(organizationMembers.id, existingMember.id));
  } else {
    await db.insert(organizationMembers).values({
      id: DEMO_IDS.promoterMembership,
      organizationId: orgId,
      userId: promoterUserId,
      role: 'owner',
      createdAt: nowIso,
    });
  }

  // Workspace Profile
  const [existingProfile] = await db
    .select()
    .from(workspaceProfiles)
    .where(eq(workspaceProfiles.organizationId, orgId))
    .limit(1);

  if (existingProfile) {
    await db
      .update(workspaceProfiles)
      .set({
        displayName: 'Rina Handayani - Promotor STIFIn',
        tagline: 'Membantu Keluarga Menemukan Potensi Genetik Terbaik',
        headline: 'Konsultan & Edukator Parenting Berbasis STIFIn',
        bio: 'Praktisi STIFIn berpengalaman mendampingi 500+ orang tua dan anak dalam memetakan mesin kecerdasan dan gaya belajar alami.',
        city: 'Jakarta Selatan',
        roleLabel: 'Senior Licensed Promotor',
        whatsappPhoneE164: '+6281200000001',
        stats: { familiesHelped: '500+', location: 'Jakarta Selatan' },
        updatedAt: nowIso,
      })
      .where(eq(workspaceProfiles.organizationId, orgId));
  } else {
    await db.insert(workspaceProfiles).values({
      id: DEMO_IDS.workspaceProfile,
      organizationId: orgId,
      displayName: 'Rina Handayani - Promotor STIFIn',
      tagline: 'Membantu Keluarga Menemukan Potensi Genetik Terbaik',
      headline: 'Konsultan & Edukator Parenting Berbasis STIFIn',
      bio: 'Praktisi STIFIn berpengalaman mendampingi 500+ orang tua dan anak dalam memetakan mesin kecerdasan dan gaya belajar alami.',
      city: 'Jakarta Selatan',
      roleLabel: 'Senior Licensed Promotor',
      whatsappPhoneE164: '+6281200000001',
      stats: { familiesHelped: '500+', location: 'Jakarta Selatan' },
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // 2b. Storefront Themes Table DDL + Canonical Demo Storefront Theme Seed
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "storefront_themes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE RESTRICT,
        "brand_name" text NOT NULL,
        "tagline" text,
        "logo_url" text,
        "primary_color" text DEFAULT '#201e1d' NOT NULL,
        "accent_color" text DEFAULT '#ec3013' NOT NULL,
        "background_color" text DEFAULT '#f3f2f2' NOT NULL,
        "surface_color" text DEFAULT '#ffffff' NOT NULL,
        "text_color" text DEFAULT '#201e1d' NOT NULL,
        "muted_text_color" text DEFAULT '#5a5954' NOT NULL,
        "style_preset" text DEFAULT 'MODERNIST' NOT NULL,
        "font_preset" text DEFAULT 'ARCHIVO' NOT NULL,
        "radius_preset" text DEFAULT 'SHARP' NOT NULL,
        "button_preset" text DEFAULT 'SOLID' NOT NULL,
        "layout_preset" text DEFAULT 'LIST' NOT NULL,
        "hero_alignment" text DEFAULT 'LEFT' NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "storefront_themes_organization_id_unique" ON "storefront_themes" ("organization_id");
    `);
  } catch (_e) {
    // Table already exists
  }

  const [existingTheme] = await db
    .select()
    .from(storefrontThemes)
    .where(eq(storefrontThemes.organizationId, orgId))
    .limit(1);

  if (existingTheme) {
    await db
      .update(storefrontThemes)
      .set({
        brandName: 'Rina Learning Studio',
        tagline: 'Ruang Belajar & Pendampingan Karakter STIFIn',
        primaryColor: '#1E293B',
        accentColor: '#E11D48',
        backgroundColor: '#F8FAFC',
        surfaceColor: '#FFFFFF',
        textColor: '#0F172A',
        mutedTextColor: '#64748B',
        stylePreset: 'MODERNIST',
        fontPreset: 'ARCHIVO',
        radiusPreset: 'SHARP',
        buttonPreset: 'SOLID',
        layoutPreset: 'LIST',
        heroAlignment: 'LEFT',
        updatedAt: nowIso,
      })
      .where(eq(storefrontThemes.organizationId, orgId));
  } else {
    await db.insert(storefrontThemes).values({
      id: 'a0000000-0000-4000-8000-000000000099',
      organizationId: orgId,
      brandName: 'Rina Learning Studio',
      tagline: 'Ruang Belajar & Pendampingan Karakter STIFIn',
      primaryColor: '#1E293B',
      accentColor: '#E11D48',
      backgroundColor: '#F8FAFC',
      surfaceColor: '#FFFFFF',
      textColor: '#0F172A',
      mutedTextColor: '#64748B',
      stylePreset: 'MODERNIST',
      fontPreset: 'ARCHIVO',
      radiusPreset: 'SHARP',
      buttonPreset: 'SOLID',
      layoutPreset: 'LIST',
      heroAlignment: 'LEFT',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // 3. Services & Availability Rules
  const serviceDefs = [
    {
      id: DEMO_IDS.svcPersonal,
      name: 'Tes STIFIn Personal',
      description: 'Tes sidik jari biometrik STIFIn 1 Orang untuk memetakan Mesin Kecerdasan & Karakter Genetik.',
      category: 'ASSESSMENT',
      priceAmount: 500000,
      durationMinutes: 60,
    },
    {
      id: DEMO_IDS.svcFamily,
      name: 'Tes STIFIn Family (Paket 4 Orang)',
      description: 'Tes lengkap keluarga untuk ayah, ibu, dan 2 anak plus sesi penjelasan dinamika relasi keluarga.',
      category: 'ASSESSMENT',
      priceAmount: 1800000,
      durationMinutes: 120,
    },
    {
      id: DEMO_IDS.svcCounseling,
      name: 'Sesi Konseling Parenting STIFIn',
      description: 'Sesi pendampingan intensif 1-on-1 bersama Promotor STIFIn untuk solusi pola asuh spesifik anak.',
      category: 'SESSION',
      priceAmount: 350000,
      durationMinutes: 60,
    },
  ];

  for (const svc of serviceDefs) {
    const [existingSvc] = await db
      .select()
      .from(services)
      .where(and(eq(services.organizationId, orgId), eq(services.name, svc.name)))
      .limit(1);

    if (existingSvc) {
      await db
        .update(services)
        .set({
          description: svc.description,
          category: svc.category,
          priceAmount: svc.priceAmount,
          durationMinutes: svc.durationMinutes,
          isActive: true,
          updatedAt: nowIso,
        })
        .where(eq(services.id, existingSvc.id));
    } else {
      await db.insert(services).values({
        id: svc.id,
        organizationId: orgId,
        name: svc.name,
        description: svc.description,
        category: svc.category,
        priceAmount: svc.priceAmount,
        durationMinutes: svc.durationMinutes,
        isActive: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  // Availability Rules (Mon-Sat)
  for (let day = 1; day <= 6; day++) {
    const isSat = day === 6;
    const ruleId = `a1000000-0000-4000-8000-00000000000${day}`;
    await db
      .insert(availabilityRules)
      .values({
        id: ruleId,
        organizationId: orgId,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: isSat ? '13:00' : '17:00',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: availabilityRules.id,
        set: {
          dayOfWeek: day,
          startTime: '09:00',
          endTime: isSat ? '13:00' : '17:00',
          isActive: true,
          updatedAt: now,
        },
      });
  }

  // 4. Programs, Modules & Lessons
  const programDefs = [
    {
      id: DEMO_IDS.programA,
      slug: '7-hari-mengenal-cara-belajar-anak',
      title: '7 Hari Mengenal Cara Belajar Anak',
      subtitle: 'Panduan Praktis Memahami Gaya Belajar Alami Berbasis Genetik',
      description: 'Program edukasi pengantar untuk orang tua agar dapat mengenali apakah anak bertipe Sensing, Thinking, Intuiting, Feeling, atau Insting dalam belajar.',
      programType: 'lead_magnet',
      accessType: 'public',
      status: 'published',
      pricing: 'free',
      priceAmount: 0,
      publishedAt: nowIso,
      presentation: {
        coverVariant: 'cover-a',
        featured: true,
        heroEyebrow: 'Mini Course Gratis Orang Tua',
        shortOutcome: 'Pahami cara belajar unik anak Anda hanya dalam 7 hari tanpa drama.',
        durationLabel: '7 Hari · 6 Materi Singkat',
        learningOutcomes: [
          { title: 'Identifikasi Gaya Belajar', description: 'Mengenali ciri spesifik gaya belajar 5 Mesin Kecerdasan.' },
          { title: 'Komunikasi Tanpa Konflik', description: 'Mengetahui kata kunci pendorong motivasi belajar anak.' },
          { title: 'Rencana Pendampingan', description: 'Membuat jadwal dan lingkungan belajar kondusif di rumah.' },
        ],
      },
    },
    {
      id: DEMO_IDS.programB,
      slug: '30-hari-setelah-tes-stifin',
      title: '30 Hari Setelah Tes STIFIn',
      subtitle: 'Pendampingan Pasca Tes untuk Mengoptimalkan Potensi Diri',
      description: 'Kurikulum bertahap 30 hari pasca tes STIFIn untuk memaksimalkan hasil tes dan merancang roadmap pengembangan diri.',
      programType: 'aftersales',
      accessType: 'manual',
      status: 'published',
      pricing: 'free',
      priceAmount: 0,
      publishedAt: nowIso,
      presentation: {
        coverVariant: 'cover-b',
        featured: false,
        heroEyebrow: 'Exclusive Aftersales Hub',
        shortOutcome: 'Roadmap implementasi 30 hari hasil tes biometrik STIFIn.',
        durationLabel: '30 Hari · 8 Modul Lengkap',
        learningOutcomes: [
          { title: 'Optimalisasi Mesin Kecerdasan', description: 'Menerapkan habit harian sesuai belahan otak dominan.' },
          { title: 'Manajemen Energi & Fokus', description: 'Menghindari penyebab stres dan kejenuhan belajar.' },
        ],
      },
    },
    {
      id: DEMO_IDS.programC,
      slug: '14-hari-komunikasi-orang-tua-anak',
      title: '14 Hari Komunikasi Orang Tua & Anak',
      subtitle: 'Seni Berdialog Efektif Berdasarkan Karakter Alami Anak',
      description: 'Panduan intensif menjalin komunikasi yang harmonis tanpa bentakan dan drama antara orang tua dan anak.',
      programType: 'paid',
      accessType: 'public',
      status: 'published',
      pricing: 'one_time',
      priceAmount: 199000,
      publishedAt: nowIso,
      presentation: {
        coverVariant: 'cover-c',
        featured: true,
        heroEyebrow: 'Masterclass Berbayar',
        shortOutcome: 'Transformasi komunikasi keluarga berbasis karakter STIFIn.',
        durationLabel: '14 Hari · 4 Sesi Intensif',
        learningOutcomes: [
          { title: 'Bahasa Cinta 5 Karakter', description: 'Menyesuaikan nada bicara dan pendekatan emosi anak.' },
          { title: 'Resolusi Konflik Cepat', description: 'Teknik meredakan emosi dan membangun kesepakatan positif.' },
        ],
      },
    },
    {
      id: DEMO_IDS.programD,
      slug: 'memahami-potensi-remaja',
      title: 'Memahami Potensi Remaja',
      subtitle: 'Menavigasi Fase Kritis Perkembangan Remaja',
      description: 'Program edukasi pengantar untuk orang tua dalam memahami karakter, minat, dan potensi bakat anak usia remaja berbasis STIFIn.',
      programType: 'lead_magnet',
      accessType: 'public',
      status: 'published',
      pricing: 'free',
      priceAmount: 0,
      publishedAt: nowIso,
      presentation: {
        coverVariant: 'cover-d',
        featured: true,
        imageUrl: 'https://stiffin-promotor-api.moxsenna.workers.dev/api/v1/assets/r2/programs/a0000000-0000-4000-8000-000000000001/b0000000-0000-4000-8000-000000000004/cover/potensi_remaja_cover.webp',
        heroEyebrow: 'Mini Course Remaja',
        shortOutcome: 'Menavigasi masa transisi remaja dengan pendekatan karakter STIFIn.',
        durationLabel: '5 Hari · 2 Pelajaran Inti',
        learningOutcomes: [
          { title: 'Pahami Perubahan Karakter Remaja', description: 'Mendampingi dinamika emosi dan komunikasi remaja sesuai mesin kecerdasan.' },
          { title: 'Arah Minat & Jurusan Belajar', description: 'Menemukan jurusan dan pilihan karier yang selaras dengan potensi genetik.' },
        ],
      },
    },
  ];

  const programIdMap = new Map<string, string>();

  for (const p of programDefs) {
    const existingResult = await db.execute(sql`
      SELECT "id", "slug" FROM "programs"
      WHERE "organization_id" = ${orgId} AND "slug" = ${p.slug}
      LIMIT 1
    `);

    const existingProg = (existingResult.rows as any[])[0];
    const actualProgId = existingProg ? existingProg.id : p.id;
    programIdMap.set(p.id, actualProgId);

    if (existingProg) {
      await db.execute(sql`
        UPDATE "programs"
        SET "title" = ${p.title},
            "subtitle" = ${p.subtitle},
            "description" = ${p.description},
            "program_type" = ${p.programType},
            "access_type" = ${p.accessType},
            "status" = ${p.status},
            "pricing" = ${p.pricing},
            "price_amount" = ${p.priceAmount},
            "published_at" = ${p.publishedAt},
            "updated_at" = ${nowIso}
        WHERE "id" = ${existingProg.id}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO "programs" (
          "id", "organization_id", "slug", "title", "subtitle", "description",
          "program_type", "access_type", "status", "pricing", "price_amount",
          "published_at", "created_at", "updated_at"
        ) VALUES (
          ${p.id}, ${orgId}, ${p.slug}, ${p.title}, ${p.subtitle}, ${p.description},
          ${p.programType}, ${p.accessType}, ${p.status}, ${p.pricing}, ${p.priceAmount},
          ${p.publishedAt}, ${nowIso}, ${nowIso}
        )
      `);
    }

    const [existingPres] = await db
      .select()
      .from(programPresentations)
      .where(eq(programPresentations.programId, actualProgId))
      .limit(1);

    if (existingPres) {
      await db
        .update(programPresentations)
        .set({
          coverVariant: p.presentation.coverVariant,
          featured: p.presentation.featured,
          heroEyebrow: p.presentation.heroEyebrow,
          shortOutcome: p.presentation.shortOutcome,
          durationLabel: p.presentation.durationLabel,
          learningOutcomes: p.presentation.learningOutcomes,
          updatedAt: nowIso,
        })
        .where(eq(programPresentations.programId, actualProgId));
    } else {
      await db.insert(programPresentations).values({
        programId: actualProgId,
        coverVariant: p.presentation.coverVariant,
        featured: p.presentation.featured,
        heroEyebrow: p.presentation.heroEyebrow,
        shortOutcome: p.presentation.shortOutcome,
        durationLabel: p.presentation.durationLabel,
        learningOutcomes: p.presentation.learningOutcomes,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  // Modules & Lessons
  const moduleLessonDefs = [
    // Program A
    {
      module: { id: DEMO_IDS.modA1, programId: DEMO_IDS.programA, title: 'Modul 1: Memahami Cara Belajar Anak', order: 1 },
      lessons: [
        {
          id: DEMO_IDS.lesA1,
          title: 'Anak Bukan Tidak Mau Belajar',
          order: 1,
          textContent: 'Seringkali orang tua mengira anak malas atau susah diatur. Padahal, setiap anak memiliki mesin kecerdasan dominan yang membuat cara penyerapan informasinya berbeda. Simak pengantar video berikut untuk memahami akar perbedaannya.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoExternalId: 'dQw4w9WgXcQ',
        },
        {
          id: DEMO_IDS.lesA2,
          title: 'Mengenali 5 Pola Belajar STIFIn',
          order: 2,
          textContent: 'Tonton video panduan 5 pola belajar berbasis Mesin Kecerdasan (Sensing, Thinking, Intuiting, Feeling, Insting).',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
          videoExternalId: 'fJ9rUzIMcZQ',
        },
        {
          id: DEMO_IDS.lesA3,
          title: 'Refleksi: Pola Belajar Anak di Rumah',
          order: 3,
          textContent: 'Tuliskan hasil pengamatan Anda terhadap respon anak ketika belajar setelah menyaksikan video pembahasan pola belajar.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=k2qgadSvNyU',
          videoExternalId: 'k2qgadSvNyU',
          reflectionType: 'long_text',
          reflectionPrompt: 'Bagaimana pola belajar anak Anda yang paling menonjol saat di rumah?',
        },
      ],
    },
    {
      module: { id: DEMO_IDS.modA2, programId: DEMO_IDS.programA, title: 'Modul 2: Menerapkan di Rumah', order: 2 },
      lessons: [
        {
          id: DEMO_IDS.lesA4,
          title: 'Membangun Lingkungan Belajar Kondusif',
          order: 1,
          textContent: 'Anak tipe Sensing butuh ruang belajar rapi dan konkrit, anak Thinking butuh kejelasan target, anak Intuiting butuh ruang eksplorasi, anak Feeling butuh suasana hangat, dan anak Insting butuh variasi dinamis. Tonton tips penataan ruang belajar di video berikut.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
          videoExternalId: '9bZkp7q19f0',
        },
        {
          id: DEMO_IDS.lesA5,
          title: 'Contoh Praktis Pendampingan Orang Tua',
          order: 2,
          textContent: 'Simak simulasi cara berkomunikasi saat mendampingi anak mengerjakan tugas sekolah di video berikut.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
          videoExternalId: 'kJQP7kiw5Fk',
        },
        {
          id: DEMO_IDS.lesA6,
          title: 'Langkah Berikutnya & Konsultasi Hasil',
          order: 3,
          textContent: 'Selamat! Anda telah menyelesaikan mini course 7 Hari Mengenal Cara Belajar Anak. Simak video rangkuman dan langkah tindak lanjut.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=JGwWNGJdvx8',
          videoExternalId: 'JGwWNGJdvx8',
          reflectionType: 'long_text',
          reflectionPrompt: 'Apa 1 komitmen perubahan pola pendampingan yang akan Anda mulai minggu ini?',
          ctaType: 'WHATSAPP',
          ctaLabel: 'Konsultasi Hasil Tes via WhatsApp',
          ctaConfig: { phoneE164: '+6281200000001' },
        },
      ],
    },

    // Program B
    {
      module: { id: DEMO_IDS.modB1, programId: DEMO_IDS.programB, title: 'Modul 1: Fondasi Pasca Tes STIFIn', order: 1 },
      lessons: [
        {
          id: DEMO_IDS.lesB1,
          title: 'Membedah Hasil Lembar Tes STIFIn',
          order: 1,
          textContent: 'Penjelasan rinci setiap angka dan matriks pada sertifikat hasil tes biometrik STIFIn Anda.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=OPf0YbXqDm0',
          videoExternalId: 'OPf0YbXqDm0',
        },
        {
          id: DEMO_IDS.lesB2,
          title: 'Memahami Belahan Otak Dominan',
          order: 2,
          textContent: 'Peran belahan otak kiri (Sensing/Thinking), otak kanan (Intuiting/Feeling), dan otak tengah (Insting). Simak penjelasannya pada video berikut.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=hT_nvWreIhg',
          videoExternalId: 'hT_nvWreIhg',
        },
        {
          id: DEMO_IDS.lesB3,
          title: 'Refleksi Kekuatan Utama Diri',
          order: 3,
          textContent: 'Temukan 3 keunggulan utama diri yang siap dikembangkan setelah menonton video panduan refleksi.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=09R8_2nJtjg',
          videoExternalId: '09R8_2nJtjg',
          reflectionType: 'long_text',
          reflectionPrompt: 'Tuliskan 3 kekuatan utama yang paling Anda rasakan setelah mengetahui hasil tes STIFIn.',
        },
      ],
    },
    {
      module: { id: DEMO_IDS.modB2, programId: DEMO_IDS.programB, title: 'Modul 2: Strategi Pembiasaan Positif', order: 2 },
      lessons: [
        {
          id: DEMO_IDS.lesB4,
          title: 'Membangun Habit Sesuai Mesin Kecerdasan',
          order: 1,
          textContent: 'Panduan membangun kebiasaan pagi, belajar, dan istirahat yang tidak menguras energi mental. Tonton video pembahasannya di bawah ini.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=RgKAFK5djSk',
          videoExternalId: 'RgKAFK5djSk',
        },
        {
          id: DEMO_IDS.lesB5,
          title: 'Manajemen Energi & Fokus Harian',
          order: 2,
          textContent: 'Strategi mencegah burnout dan menjaga konsistensi produktivitas harian.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=YQHsXMglC9A',
          videoExternalId: 'YQHsXMglC9A',
        },
        {
          id: DEMO_IDS.lesB6,
          title: 'Mengatasi Hambatan Belajar Alami',
          order: 3,
          textContent: 'Identifikasi celah kelemahan alami dan cara mengatasinya tanpa memaksakan diri.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=CevxZvSJLk8',
          videoExternalId: 'CevxZvSJLk8',
          reflectionType: 'long_text',
          reflectionPrompt: 'Hambatan apa yang paling sering muncul dan bagaimana solusi berbasis STIFIn Anda?',
        },
      ],
    },
    {
      module: { id: DEMO_IDS.modB3, programId: DEMO_IDS.programB, title: 'Modul 3: Roadmap Jangka Panjang', order: 3 },
      lessons: [
        {
          id: DEMO_IDS.lesB7,
          title: 'Menentukan Pilihan Jurusan & Karir',
          order: 1,
          textContent: 'Pemetaan jurusan kuliah dan jalur karir yang paling selaras dengan Mesin Kecerdasan. Simak video panduan roadmap karir.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=2Vv-BfVoq4g',
          videoExternalId: '2Vv-BfVoq4g',
        },
        {
          id: DEMO_IDS.lesB8,
          title: 'Sesi Konseling Lanjutan Keluarga',
          order: 2,
          textContent: 'Ingin berdiskusi lebih dalam mengenai sinergi antar anggota keluarga? Simak video penjelasan lalu jadwalkan sesi konseling lanjutan.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=fLexgOxsZu0',
          videoExternalId: 'fLexgOxsZu0',
          ctaType: 'FLOW_BOOKING',
          ctaLabel: 'Jadwalkan Sesi Konseling Keluarga',
        },
      ],
    },

    // Program C
    {
      module: { id: DEMO_IDS.modC1, programId: DEMO_IDS.programC, title: 'Modul 1: Bahasa Cinta & Dialog', order: 1 },
      lessons: [
        {
          id: DEMO_IDS.lesC1,
          title: 'Prinsip Komunikasi 5 Mesin Kecerdasan',
          order: 1,
          textContent: 'Kunci bahasa komunikasi yang tepat sesuai dengan mesin kecerdasan dominan lawan bicara.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=papuvlVeZg8',
          videoExternalId: 'papuvlVeZg8',
        },
        {
          id: DEMO_IDS.lesC2,
          title: 'Mendengarkan Secara Empatik',
          order: 2,
          textContent: 'Latihan 3 langkah mendengarkan aktif tanpa menyela atau menghakimi.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=60ItHLz5WEA',
          videoExternalId: '60ItHLz5WEA',
          reflectionType: 'long_text',
          reflectionPrompt: 'Tuliskan pengalaman Anda saat mencoba mendengarkan anak tanpa menyela hari ini.',
        },
      ],
    },
    {
      module: { id: DEMO_IDS.modC2, programId: DEMO_IDS.programC, title: 'Modul 2: Praktek Lapangan & Resolusi', order: 2 },
      lessons: [
        {
          id: DEMO_IDS.lesC3,
          title: 'Mengatasi Konflik Tanpa Drama',
          order: 1,
          textContent: 'Teknik time-out dan de-eskalasi emosi saat anak sedang tantrum atau marah. Tonton simulasinya di video berikut.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=7wtfhZwyrcc',
          videoExternalId: '7wtfhZwyrcc',
        },
        {
          id: DEMO_IDS.lesC4,
          title: 'Refleksi Akhir & Sesi Tanya Jawab',
          order: 2,
          textContent: 'Rangkuman seluruh materi 14 Hari Komunikasi Orang Tua & Anak.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=uelHwf8o7_U',
          videoExternalId: 'uelHwf8o7_U',
          reflectionType: 'long_text',
          reflectionPrompt: 'Perubahan apa yang paling nyata terjadi dalam relasi Anda dengan anak setelah kelas ini?',
          ctaType: 'FLOW_BOOKING',
          ctaLabel: 'Daftar Sesi Pendampingan 1-on-1',
        },
      ],
    },

    // Program D
    {
      module: { id: DEMO_IDS.modD1, programId: DEMO_IDS.programD, title: 'Modul 1: Karakteristik Remaja STIFIn', order: 1 },
      lessons: [
        {
          id: DEMO_IDS.lesD1,
          title: 'Perubahan Hormon vs Karakter Genetik',
          order: 1,
          textContent: 'Eksplorasi transisi masa pubertas dan pengaruh mesin kecerdasan terhadap perilaku remaja. Simak video pembahasannya di bawah ini.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=M7lc1UVf-VE',
          videoExternalId: 'M7lc1UVf-VE',
        },
        {
          id: DEMO_IDS.lesD2,
          title: 'Menjaga Hubungan Positif di Usia Belasan',
          order: 2,
          textContent: 'Tips menjalin persahabatan dan dialog terbuka antara orang tua dan remaja tanpa menghakimi.',
          videoProvider: 'youtube',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoExternalId: 'dQw4w9WgXcQ',
          reflectionType: 'long_text',
          reflectionPrompt: 'Apa tantangan komunikasi terbesar yang Anda hadapi bersama anak remaja Anda saat ini?',
          ctaType: 'FLOW_BOOKING',
          ctaLabel: 'Jadwalkan Konseling Minat Bakat Remaja',
        },
      ],
    },
  ];

  for (const mDef of moduleLessonDefs) {
    const progId = programIdMap.get(mDef.module.programId) || mDef.module.programId;

    await db
      .insert(modules)
      .values({
        id: mDef.module.id,
        programId: progId,
        title: mDef.module.title,
        order: mDef.module.order,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: modules.id,
        set: {
          title: mDef.module.title,
          order: mDef.module.order,
          updatedAt: nowIso,
        },
      });

    for (const lDef of mDef.lessons) {
      await db
        .insert(lessons)
        .values({
          id: lDef.id,
          moduleId: mDef.module.id,
          title: lDef.title,
          order: lDef.order,
          textContent: lDef.textContent,
          videoProvider: (lDef as any).videoProvider || null,
          videoUrl: (lDef as any).videoUrl || null,
          videoExternalId: (lDef as any).videoExternalId || null,
          reflectionType: (lDef as any).reflectionType || null,
          reflectionPrompt: (lDef as any).reflectionPrompt || null,
          ctaType: (lDef as any).ctaType || null,
          ctaLabel: (lDef as any).ctaLabel || null,
          ctaConfig: (lDef as any).ctaConfig || null,
          isRequired: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .onConflictDoUpdate({
          target: lessons.id,
          set: {
            title: lDef.title,
            order: lDef.order,
            textContent: lDef.textContent,
            videoProvider: (lDef as any).videoProvider || null,
            videoUrl: (lDef as any).videoUrl || null,
            videoExternalId: (lDef as any).videoExternalId || null,
            reflectionType: (lDef as any).reflectionType || null,
            reflectionPrompt: (lDef as any).reflectionPrompt || null,
            ctaType: (lDef as any).ctaType || null,
            ctaLabel: (lDef as any).ctaLabel || null,
            ctaConfig: (lDef as any).ctaConfig || null,
            updatedAt: nowIso,
          },
        });
    }
  }

  // 5. Contacts
  const contactDefs = [
    {
      id: DEMO_IDS.contactAyu,
      name: 'Ayu Rahma',
      phoneE164: '+6281200000011',
      email: 'ayu.rahma@demo.stifin.id',
      stage: 'FOLLOW_UP',
      classification: 'PROSPECT',
      interest: 'Kelas Parenting & Tes STIFIn Anak',
      notes: 'Peserta sangat antusias, telah menyelesaikan program 7 Hari Mengenal Cara Belajar Anak (100%) dan mengklik CTA konsultasi.',
    },
    {
      id: DEMO_IDS.contactRatna,
      name: 'Ratna Dewi',
      phoneE164: '+6281200000012',
      email: 'ratna.dewi@demo.stifin.id',
      stage: 'INTERESTED',
      classification: 'CLIENT',
      interest: 'Optimalisasi Pasca Tes STIFIn',
      notes: 'Sedang aktif menyelesaikan program 30 Hari Setelah Tes STIFIn (progres ~80%).',
    },
    {
      id: DEMO_IDS.contactBimo,
      name: 'Bimo Prasetyo',
      phoneE164: '+6281200000013',
      email: 'bimo.prasetyo@demo.stifin.id',
      stage: 'FOLLOW_UP',
      classification: 'PROSPECT',
      interest: 'Cara Belajar Anak',
      notes: 'Sempat aktif belajar di Program A namun belum membuka materi dalam 8 hari terakhir.',
    },
    {
      id: DEMO_IDS.contactRani,
      name: 'Rani Kusuma',
      phoneE164: '+6281200000014',
      email: 'rani.kusuma@demo.stifin.id',
      stage: 'NEW',
      classification: 'PROSPECT',
      interest: 'Edukasi STIFIn Pemula',
      notes: 'Baru mendaftar ke Program A (progres 0%). Perlu disapa via WhatsApp.',
    },
    {
      id: DEMO_IDS.contactSiti,
      name: 'Siti Aisyah',
      phoneE164: '+6281200000015',
      email: 'siti.aisyah@demo.stifin.id',
      stage: 'INTERESTED',
      classification: 'CLIENT',
      interest: 'Komunikasi Pasutri & Anak',
      notes: 'Lulus 100% Program 14 Hari Komunikasi Orang Tua & Anak.',
    },
    {
      id: DEMO_IDS.contactArief,
      name: 'Arief Santoso',
      phoneE164: '+6281200000016',
      email: 'arief.santoso@demo.stifin.id',
      stage: 'BOOKED',
      classification: 'CLIENT',
      interest: 'Tes STIFIn Family 4 Orang',
      notes: 'Telah booking jadwal Tes Family dan pembayaran lunas.',
    },
    {
      id: DEMO_IDS.contactDimas,
      name: 'Dimas Prakoso',
      phoneE164: '+6281200000017',
      email: 'dimas.prakoso@demo.stifin.id',
      stage: 'BOOKED',
      classification: 'PROSPECT',
      interest: 'Tes STIFIn Personal',
      notes: 'Flow-Only Contact: Booking tes personal pending pembayaran.',
    },
    {
      id: DEMO_IDS.contactHendra,
      name: 'Hendra Wijaya',
      phoneE164: '+6281200000018',
      email: 'hendra.wijaya@demo.stifin.id',
      stage: 'INTERESTED',
      classification: 'PROSPECT',
      interest: 'Sesi Konseling Parenting',
      notes: 'Flow-Only Contact: Tertarik sesi konseling keluarga.',
    },
    {
      id: DEMO_IDS.contactSinta,
      name: 'Sinta Maharani',
      phoneE164: '+6281200000019',
      email: 'sinta.maharani@demo.stifin.id',
      stage: 'COMPLETED',
      classification: 'CLIENT',
      interest: 'Tes STIFIn Personal Selesai',
      notes: 'Sesi tes telah selesai dilaksanakan, masuk ke masa Aftercare D+7.',
    },
  ];

  const contactIdMap = new Map<string, string>();

  for (const c of contactDefs) {
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.organizationId, orgId), eq(contacts.phoneE164, c.phoneE164)))
      .limit(1);

    const actualContactId = existingContact ? existingContact.id : c.id;
    contactIdMap.set(c.id, actualContactId);

    if (existingContact) {
      await db
        .update(contacts)
        .set({
          name: c.name,
          email: c.email,
          updatedAt: nowIso,
        })
        .where(eq(contacts.id, existingContact.id));
    } else {
      await db.insert(contacts).values({
        id: c.id,
        organizationId: orgId,
        name: c.name,
        phoneE164: c.phoneE164,
        email: c.email,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    const [existingState] = await db
      .select()
      .from(contactFlowStates)
      .where(eq(contactFlowStates.contactId, actualContactId))
      .limit(1);

    if (existingState) {
      await db
        .update(contactFlowStates)
        .set({
          stage: c.stage,
          classification: c.classification,
          interest: c.interest,
          notes: c.notes,
          updatedAt: nowIso,
        })
        .where(eq(contactFlowStates.contactId, actualContactId));
    } else {
      await db.insert(contactFlowStates).values({
        organizationId: orgId,
        contactId: actualContactId,
        stage: c.stage,
        classification: c.classification,
        interest: c.interest,
        notes: c.notes,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  // 6. Helper for recording lesson completion
  async function recordLessonCompletion(params: {
    enrollmentId: string;
    contactId: string;
    lessonId: string;
    reflectionText?: string;
  }) {
    const [existingProg] = await db
      .select({ id: lessonProgress.id })
      .from(lessonProgress)
      .where(and(eq(lessonProgress.enrollmentId, params.enrollmentId), eq(lessonProgress.lessonId, params.lessonId)))
      .limit(1);

    if (existingProg) {
      await db
        .update(lessonProgress)
        .set({ isCompleted: true, completedAt: now, updatedAt: now })
        .where(eq(lessonProgress.id, existingProg.id));
    } else {
      await db.insert(lessonProgress).values({
        organizationId: orgId,
        enrollmentId: params.enrollmentId,
        lessonId: params.lessonId,
        isCompleted: true,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (params.reflectionText) {
      const [existingRef] = await db
        .select({ id: reflectionResponses.id })
        .from(reflectionResponses)
        .where(and(eq(reflectionResponses.enrollmentId, params.enrollmentId), eq(reflectionResponses.lessonId, params.lessonId)))
        .limit(1);

      if (existingRef) {
        await db
          .update(reflectionResponses)
          .set({ responseText: params.reflectionText, submittedAt: now })
          .where(eq(reflectionResponses.id, existingRef.id));
      } else {
        await db.insert(reflectionResponses).values({
          organizationId: orgId,
          enrollmentId: params.enrollmentId,
          lessonId: params.lessonId,
          responseText: params.reflectionText,
          submittedAt: now,
        });
      }
    }
  }

  // 7. Enrollments
  const ayuContactId = contactIdMap.get(DEMO_IDS.contactAyu) || DEMO_IDS.contactAyu;
  const ratnaContactId = contactIdMap.get(DEMO_IDS.contactRatna) || DEMO_IDS.contactRatna;
  const bimoContactId = contactIdMap.get(DEMO_IDS.contactBimo) || DEMO_IDS.contactBimo;
  const raniContactId = contactIdMap.get(DEMO_IDS.contactRani) || DEMO_IDS.contactRani;
  const sitiContactId = contactIdMap.get(DEMO_IDS.contactSiti) || DEMO_IDS.contactSiti;
  const ariefContactId = contactIdMap.get(DEMO_IDS.contactArief) || DEMO_IDS.contactArief;

  const progAId = programIdMap.get(DEMO_IDS.programA) || DEMO_IDS.programA;
  const progBId = programIdMap.get(DEMO_IDS.programB) || DEMO_IDS.programB;
  const progCId = programIdMap.get(DEMO_IDS.programC) || DEMO_IDS.programC;

  // Ayu on Program A (100% Completed)
  await db
    .insert(enrollments)
    .values({
      id: DEMO_IDS.enrAyuA,
      organizationId: orgId,
      programId: progAId,
      contactId: ayuContactId,
      status: 'COMPLETED',
      progressPercent: 100,
      intentScore: 95,
      intentLabel: 'HOT',
      learningStatus: 'COMPLETED',
      enrolledAt: nowIso,
      startedAt: nowIso,
      completedAt: nowIso,
      lastActivityAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: enrollments.id,
      set: {
        status: 'COMPLETED',
        progressPercent: 100,
        intentScore: 95,
        intentLabel: 'HOT',
        learningStatus: 'COMPLETED',
        completedAt: nowIso,
        lastActivityAt: nowIso,
        updatedAt: nowIso,
      },
    });

  for (let i = 1; i <= 6; i++) {
    const lesId = (DEMO_IDS as any)[`lesA${i}`];
    await recordLessonCompletion({
      enrollmentId: DEMO_IDS.enrAyuA,
      contactId: ayuContactId,
      lessonId: lesId,
      reflectionText: i === 3 ? 'Refleksi Ayu: Anak saya lebih mudah fokus saat didampingi penuh empati.' : undefined,
    });
  }

  // Signal for Ayu
  const signalId = '70000000-0000-4000-8000-000000000001';
  const [existingSignal] = await db
    .select({ id: learningSignals.id })
    .from(learningSignals)
    .where(and(eq(learningSignals.enrollmentId, DEMO_IDS.enrAyuA), eq(learningSignals.reason, 'PROGRAM_COMPLETED')))
    .limit(1);

  if (existingSignal) {
    await db
      .update(learningSignals)
      .set({ status: 'ACTIVE', priority: 95, updatedAt: now })
      .where(eq(learningSignals.id, existingSignal.id));
  } else {
    await db.insert(learningSignals).values({
      id: signalId,
      organizationId: orgId,
      enrollmentId: DEMO_IDS.enrAyuA,
      contactId: ayuContactId,
      programId: progAId,
      type: 'HIGH_LEARNING_INTENT',
      priority: 95,
      reason: 'PROGRAM_COMPLETED',
      recommendedActionType: 'FOLLOW_UP',
      recommendedActionReason: 'Peserta telah menyelesaikan seluruh materi program 7 Hari Mengenal Cara Belajar Anak.',
      status: 'ACTIVE',
      metadata: {
        programId: progAId,
        programTitle: '7 Hari Mengenal Cara Belajar Anak',
        intentScore: 95,
        intentLabel: 'HOT',
      },
      createdAt: now,
      updatedAt: now,
    });
  }

  // Ayu on Program B (50%)
  await db
    .insert(enrollments)
    .values({
      id: DEMO_IDS.enrAyuB,
      organizationId: orgId,
      programId: progBId,
      contactId: ayuContactId,
      status: 'STARTED',
      progressPercent: 50,
      intentScore: 60,
      intentLabel: 'WARM',
      learningStatus: 'IN_PROGRESS',
      enrolledAt: nowIso,
      startedAt: nowIso,
      lastActivityAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: enrollments.id,
      set: {
        status: 'STARTED',
        progressPercent: 50,
        intentScore: 60,
        intentLabel: 'WARM',
        learningStatus: 'IN_PROGRESS',
        updatedAt: nowIso,
      },
    });

  for (let i = 1; i <= 4; i++) {
    const lesId = (DEMO_IDS as any)[`lesB${i}`];
    await recordLessonCompletion({
      enrollmentId: DEMO_IDS.enrAyuB,
      contactId: ayuContactId,
      lessonId: lesId,
    });
  }

  // Ayu on Program C (25%)
  await db
    .insert(enrollments)
    .values({
      id: DEMO_IDS.enrAyuC,
      organizationId: orgId,
      programId: progCId,
      contactId: ayuContactId,
      status: 'STARTED',
      progressPercent: 25,
      intentScore: 40,
      intentLabel: 'WARM',
      learningStatus: 'IN_PROGRESS',
      enrolledAt: nowIso,
      startedAt: nowIso,
      lastActivityAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: enrollments.id,
      set: {
        status: 'STARTED',
        progressPercent: 25,
        intentScore: 40,
        intentLabel: 'WARM',
        learningStatus: 'IN_PROGRESS',
        updatedAt: nowIso,
      },
    });

  // Ratna Dewi on Program B (88%)
  await db
    .insert(enrollments)
    .values({
      id: DEMO_IDS.enrRatnaB,
      organizationId: orgId,
      programId: progBId,
      contactId: ratnaContactId,
      status: 'STARTED',
      progressPercent: 88,
      intentScore: 80,
      intentLabel: 'HOT',
      learningStatus: 'IN_PROGRESS',
      enrolledAt: nowIso,
      startedAt: nowIso,
      lastActivityAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: enrollments.id,
      set: {
        progressPercent: 88,
        intentScore: 80,
        intentLabel: 'HOT',
        learningStatus: 'IN_PROGRESS',
        updatedAt: nowIso,
      },
    });

  // Bimo on Program A (At risk / inactive)
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

  await db
    .insert(enrollments)
    .values({
      id: DEMO_IDS.enrBimoA,
      organizationId: orgId,
      programId: progAId,
      contactId: bimoContactId,
      status: 'STARTED',
      progressPercent: 33,
      intentScore: 30,
      intentLabel: 'COLD',
      learningStatus: 'AT_RISK',
      enrolledAt: tenDaysAgo,
      startedAt: tenDaysAgo,
      lastActivityAt: eightDaysAgo,
      createdAt: tenDaysAgo,
      updatedAt: eightDaysAgo,
    })
    .onConflictDoUpdate({
      target: enrollments.id,
      set: {
        progressPercent: 33,
        intentScore: 30,
        intentLabel: 'COLD',
        learningStatus: 'AT_RISK',
        lastActivityAt: eightDaysAgo,
        updatedAt: eightDaysAgo,
      },
    });

  // Rani on Program A (0% / New)
  await db
    .insert(enrollments)
    .values({
      id: DEMO_IDS.enrRaniA,
      organizationId: orgId,
      programId: progAId,
      contactId: raniContactId,
      status: 'ENROLLED',
      progressPercent: 0,
      intentScore: 10,
      intentLabel: 'COLD',
      learningStatus: 'NOT_STARTED',
      enrolledAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: enrollments.id,
      set: {
        status: 'ENROLLED',
        progressPercent: 0,
        updatedAt: nowIso,
      },
    });

  // Siti on Program C (100% Completed)
  await db
    .insert(enrollments)
    .values({
      id: DEMO_IDS.enrSitiC,
      organizationId: orgId,
      programId: progCId,
      contactId: sitiContactId,
      status: 'COMPLETED',
      progressPercent: 100,
      intentScore: 90,
      intentLabel: 'HOT',
      learningStatus: 'COMPLETED',
      enrolledAt: nowIso,
      startedAt: nowIso,
      completedAt: nowIso,
      lastActivityAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: enrollments.id,
      set: {
        status: 'COMPLETED',
        progressPercent: 100,
        intentScore: 90,
        intentLabel: 'HOT',
        learningStatus: 'COMPLETED',
        completedAt: nowIso,
        updatedAt: nowIso,
      },
    });

  // Arief on Program B (25%)
  await db
    .insert(enrollments)
    .values({
      id: DEMO_IDS.enrAriefB,
      organizationId: orgId,
      programId: progBId,
      contactId: ariefContactId,
      status: 'STARTED',
      progressPercent: 25,
      intentScore: 35,
      intentLabel: 'WARM',
      learningStatus: 'IN_PROGRESS',
      enrolledAt: nowIso,
      startedAt: nowIso,
      lastActivityAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: enrollments.id,
      set: {
        progressPercent: 25,
        updatedAt: nowIso,
      },
    });

  // 8. NextActions & Activities
  const canonicalIdempotencyKey = `promotorclass:${DEMO_IDS.enrAyuA}:completed`;
  const [existingAction] = await db
    .select({ id: nextActions.id })
    .from(nextActions)
    .where(and(eq(nextActions.organizationId, orgId), eq(nextActions.source, 'PROMOTORCLASS'), eq(nextActions.idempotencyKey, canonicalIdempotencyKey)))
    .limit(1);

  if (existingAction) {
    await db
      .update(nextActions)
      .set({
        title: 'Follow-up Lulus Program: 7 Hari Mengenal Cara Belajar Anak',
        status: 'PENDING',
        priority: 95,
        updatedAt: nowIso,
      })
      .where(eq(nextActions.id, existingAction.id));
  } else {
    await db.insert(nextActions).values({
      id: '80000000-0000-4000-8000-000000000001',
      organizationId: orgId,
      contactId: ayuContactId,
      actionType: 'FOLLOW_UP',
      title: 'Follow-up Lulus Program: 7 Hari Mengenal Cara Belajar Anak',
      description: 'Peserta telah menyelesaikan 100% materi dan mengklik CTA konsultasi hasil tes.',
      dueAt: nowIso,
      priority: 95,
      status: 'PENDING',
      source: 'PROMOTORCLASS',
      sourceEventId: DEMO_IDS.enrAyuA,
      sourceSignalId: signalId,
      idempotencyKey: canonicalIdempotencyKey,
      contextJson: {
        programId: progAId,
        programTitle: '7 Hari Mengenal Cara Belajar Anak',
        intentLabel: 'hot',
        intentScore: 95,
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  await db.insert(activities).values({
    organizationId: orgId,
    contactId: ayuContactId,
    eventType: 'CLASS_SIGNAL',
    metadataJson: {
      programId: progAId,
      programTitle: '7 Hari Mengenal Cara Belajar Anak',
      reason: 'PROGRAM_COMPLETED',
      intentLabel: 'HOT',
    },
    occurredAt: nowIso,
  });

  // 9. Bookings & Flow NextActions
  const dimasContactId = contactIdMap.get(DEMO_IDS.contactDimas) || DEMO_IDS.contactDimas;
  const hendraContactId = contactIdMap.get(DEMO_IDS.contactHendra) || DEMO_IDS.contactHendra;
  const sintaContactId = contactIdMap.get(DEMO_IDS.contactSinta) || DEMO_IDS.contactSinta;

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // Booking Dimas (Pending payment)
  await db
    .insert(bookings)
    .values({
      id: DEMO_IDS.bookingDimas,
      organizationId: orgId,
      contactId: dimasContactId,
      serviceId: DEMO_IDS.svcPersonal,
      amount: 500000,
      startAt: tomorrow.toISOString(),
      locationType: 'ONLINE',
      locationText: 'Google Meet',
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      notes: 'Calon peserta ingin tes personal secara online.',
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: bookings.id,
      set: {
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        updatedAt: nowIso,
      },
    });

  // Booking Arief (Confirmed, Paid)
  await db
    .insert(bookings)
    .values({
      id: DEMO_IDS.bookingArief,
      organizationId: orgId,
      contactId: ariefContactId,
      serviceId: DEMO_IDS.svcFamily,
      amount: 1800000,
      startAt: tomorrow.toISOString(),
      locationType: 'HOME_VISIT',
      locationText: 'Jl. Melati No. 12, Jakarta Selatan',
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      notes: 'Tes Family 4 Orang di rumah klien.',
      createdAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoUpdate({
      target: bookings.id,
      set: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        updatedAt: nowIso,
      },
    });

  // Booking Sinta (Completed, Aftercare D+7)
  await db
    .insert(bookings)
    .values({
      id: DEMO_IDS.bookingSinta,
      organizationId: orgId,
      contactId: sintaContactId,
      serviceId: DEMO_IDS.svcPersonal,
      amount: 500000,
      startAt: yesterday,
      locationType: 'ON_SITE',
      locationText: 'STIFIn Parenting Lounge Jakarta',
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      completedAt: yesterday,
      notes: 'Sesi tes personal selesai dengan lancar. Hasil: Feeling Extrovert.',
      createdAt: yesterday,
      updatedAt: yesterday,
    })
    .onConflictDoUpdate({
      target: bookings.id,
      set: {
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        completedAt: yesterday,
        updatedAt: yesterday,
      },
    });

  const aftercareDate = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();
  const [existingAftercare] = await db
    .select({ id: aftercareRecords.id })
    .from(aftercareRecords)
    .where(and(eq(aftercareRecords.organizationId, orgId), eq(aftercareRecords.bookingId, DEMO_IDS.bookingSinta)))
    .limit(1);

  if (existingAftercare) {
    await db
      .update(aftercareRecords)
      .set({
        scheduledFor: aftercareDate,
        status: 'PENDING',
        updatedAt: nowIso,
      })
      .where(eq(aftercareRecords.id, existingAftercare.id));
  } else {
    await db.insert(aftercareRecords).values({
      id: 'b1000000-0000-4000-8000-000000000001',
      organizationId: orgId,
      bookingId: DEMO_IDS.bookingSinta,
      contactId: sintaContactId,
      scheduledFor: aftercareDate,
      status: 'PENDING',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // 10. Primary Learner Access Token
  const tokenHash = createHash('sha256').update(learnerSecret).digest('hex');
  const tokenExpiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const [existingToken] = await db
    .select()
    .from(learnerAccessTokens)
    .where(eq(learnerAccessTokens.tokenHash, tokenHash))
    .limit(1);

  if (existingToken) {
    await db
      .update(learnerAccessTokens)
      .set({ expiresAt: tokenExpiry })
      .where(eq(learnerAccessTokens.id, existingToken.id));
  } else {
    await db.insert(learnerAccessTokens).values({
      id: 'a2000000-0000-4000-8000-000000000001',
      organizationId: orgId,
      contactId: ayuContactId,
      tokenHash,
      expiresAt: tokenExpiry,
      createdAt: nowIso,
    });
  }

  console.log('[SEED] Demo workspace seeded completely with real state!');

  return {
    organizationId: orgId,
    promoterEmail,
    promoterUserId,
  };
}

export async function verifyStagingDemo(db: NodePgDatabase) {
  assertStagingEnvironment();

  const orgRows = await db.select().from(organizations).where(eq(organizations.slug, 'demo-promotor'));
  const userRows = await db.select().from(users).where(eq(users.email, 'demo.promotor@stifin.id'));
  const progResult = orgRows[0] ? await db.execute(sql`SELECT "id", "slug", "status" FROM "programs" WHERE "organization_id" = ${orgRows[0].id}`) : { rows: [] };
  const progRows = progResult.rows as any[];
  const contactRows = orgRows[0] ? await db.select().from(contacts).where(and(eq(contacts.organizationId, orgRows[0].id), isNull(contacts.deletedAt))) : [];
  const enrollmentRows = orgRows[0] ? await db.select().from(enrollments).where(eq(enrollments.organizationId, orgRows[0].id)) : [];
  const signalsRows = orgRows[0] ? await db.select().from(learningSignals).where(eq(learningSignals.organizationId, orgRows[0].id)) : [];
  const themeRows = orgRows[0] ? await db.select().from(storefrontThemes).where(eq(storefrontThemes.organizationId, orgRows[0].id)) : [];

  return {
    passed: orgRows.length === 1 && userRows.length === 1 && progRows.length >= 4 && contactRows.length >= 8 && enrollmentRows.length >= 6 && themeRows.length === 1,
    summary: {
      orgSlug: orgRows[0]?.slug || 'unknown',
      promoterEmail: userRows[0]?.email || 'unknown',
      programsCount: progRows.length,
      contactsCount: contactRows.length,
      enrollmentsCount: enrollmentRows.length,
      signalsCount: signalsRows.length,
      themeBrandName: themeRows[0]?.brandName || 'none',
      themePrimaryColor: themeRows[0]?.primaryColor || 'none',
      themePreset: themeRows[0]?.stylePreset || 'none',
    },
  };
}
