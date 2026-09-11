import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import {
  organizations,
  productEntitlements,
  organizationSubscriptions,
  workspaceProfiles,
  programs,
  programPresentations,
  programPriceVariants,
  promoCoupons,
  modules,
  lessons,
  contacts,
  contactFlowStates,
  enrollments,
  lessonProgress,
  reflectionResponses,
  learningSignals,
  learnerLessonNotes,
  certificates,
  commerceOrders,
  paymentRecords,
  activities,
  messageTemplates,
  services,
} from '../src/db/schema';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  const db = drizzle(client);

  console.log('=== SEEDING COMPREHENSIVE PRODUCTION DEMO FOR RINA ===');

  // 1. Resolve Organization "rina"
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, 'rina'))
    .limit(1);

  if (!org) {
    console.error('Organization "rina" not found. Please run seed-production-rina.ts first!');
    process.exit(1);
  }

  const orgId = org.id;
  console.log('✓ Found Organization "rina":', orgId);

  // 2. Ensure Entitlements & Subscription
  await db
    .update(productEntitlements)
    .set({ promotorClass: true, promotorFlow: true })
    .where(eq(productEntitlements.organizationId, orgId));

  await db
    .update(organizationSubscriptions)
    .set({
      planCode: 'SOLO',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
    })
    .where(eq(organizationSubscriptions.organizationId, orgId));
  console.log('✓ Verified Entitlements and SOLO Subscription');

  // 3. Programs Definition
  console.log('Seeding Programs...');

  // Program 1: 7 Hari Mengenal Cara Belajar Anak (Lead Magnet, Free)
  let [p1] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.organizationId, orgId), eq(programs.slug, '7-hari-mengenal-cara-belajar-anak')))
    .limit(1);

  if (!p1) {
    [p1] = await db
      .insert(programs)
      .values({
        organizationId: orgId,
        title: '7 Hari Mengenal Cara Belajar Anak',
        subtitle: 'Panduan Praktis Orang Tua Mengidentifikasi Mesin Kecerdasan Anak (STIFIn)',
        description: 'E-course 7 hari khusus untuk orang tua yang ingin memahami bakat genetik dan gaya belajar ideal anak.',
        slug: '7-hari-mengenal-cara-belajar-anak',
        programType: 'lead_magnet',
        status: 'published',
        accessType: 'public',
        pricing: 'free',
        priceAmount: 0,
      })
      .returning();
  }

  // Program 2: Mentoring STIFIn Parenting Eksklusif (Paid Flagship)
  let [p2] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.organizationId, orgId), eq(programs.slug, 'mentoring-stifin-parenting-eksklusif')))
    .limit(1);

  if (!p2) {
    [p2] = await db
      .insert(programs)
      .values({
        organizationId: orgId,
        title: 'Mentoring STIFIn Parenting Eksklusif',
        subtitle: 'Bimbingan Menyeluruh Pola Asuh Berbasis Mesin Kecerdasan Genetik',
        description: 'Program pendampingan intensif bagi orang tua untuk mengoptimalkan potensi anak, meminimalisir konflik harian, dan membangun komunikasi harmonis sesuai cetak biru genetiknya.',
        slug: 'mentoring-stifin-parenting-eksklusif',
        programType: 'paid',
        status: 'published',
        accessType: 'public',
        pricing: 'one_time',
        priceAmount: 199000,
      })
      .returning();
    console.log('✓ Created Program 2: Mentoring STIFIn Parenting Eksklusif');
  }

  // Program 3: Tantangan 30 Hari Membangun Kebiasaan Belajar Anak Juara (Paid)
  let [p3] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.organizationId, orgId), eq(programs.slug, 'tantangan-30-hari-kebiasaan-belajar')))
    .limit(1);

  if (!p3) {
    [p3] = await db
      .insert(programs)
      .values({
        organizationId: orgId,
        title: 'Tantangan 30 Hari Kebiasaan Belajar Anak Juara',
        subtitle: 'Bentuk Disiplin Belajar Mandiri Tanpa Perlu Disuruh & Bebas Stres',
        description: 'Panduan harian terstruktur untuk melatih anak menyukai proses belajar dengan metode stimulasi genetik sesuai tipologi otaknya.',
        slug: 'tantangan-30-hari-kebiasaan-belajar',
        programType: 'paid',
        status: 'published',
        accessType: 'public',
        pricing: 'one_time',
        priceAmount: 249000,
      })
      .returning();
    console.log('✓ Created Program 3: Tantangan 30 Hari Kebiasaan Belajar');
  }

  // Program 4: Konseling Lanjutan Hasil Tes STIFIn (Aftersales, Manual Free)
  let [p4] = await db
    .select()
    .from(programs)
    .where(and(eq(programs.organizationId, orgId), eq(programs.slug, 'konseling-lanjutan-hasil-tes-stifin')))
    .limit(1);

  if (!p4) {
    [p4] = await db
      .insert(programs)
      .values({
        organizationId: orgId,
        title: 'Konseling Lanjutan Hasil Tes STIFIn',
        subtitle: 'Sesi Khusus Alumni & Klien Tes untuk Review Perkembangan Pola Asuh',
        description: 'Materi pengayaan dan evaluasi tindak lanjut bagi orang tua yang telah mengikuti tes STIFIn bersama Promotor Rina.',
        slug: 'konseling-lanjutan-hasil-tes-stifin',
        programType: 'aftersales',
        status: 'published',
        accessType: 'manual',
        pricing: 'free',
        priceAmount: 0,
      })
      .returning();
    console.log('✓ Created Program 4: Konseling Lanjutan Hasil Tes STIFIn');
  }

  // 4. Update Workspace Profile & Hero Program
  console.log('Updating Workspace Profile...');
  await db
    .update(workspaceProfiles)
    .set({
      displayName: 'STIFIn Promotor Jakarta',
      headline: 'Konsultan & Promotor Resmi STIFIn Berlisensi',
      tagline: 'Membimbing Potensi Anak Sesuai Cetak Biru Genetiknya',
      bio: 'Membantu lebih dari 250+ keluarga di Indonesia mengenali mesin kecerdasan genetik anak (Sensing, Thinking, Intuiting, Feeling, Insting). Kami menghadirkan program edukasi praktis dan konsultasi privat agar orang tua bisa mendidik tanpa paksaan, minim konflik, dan memaksimalkan potensi sejati anak.',
      city: 'Jakarta Selatan & Online',
      roleLabel: 'Senior Licensed Promotor',
      whatsappPhoneE164: '+6281234567890',
      heroProgramId: p1.id,
      stats: {
        familiesHelped: '250+',
        location: 'Jakarta & Online',
      },
    })
    .where(eq(workspaceProfiles.organizationId, orgId));
  console.log('✓ Workspace Profile updated with rich bio & stats');

  // 5. Program Presentations
  console.log('Seeding Program Presentations...');
  const presentationsData = [
    {
      programId: p1.id,
      coverVariant: 'cover-a',
      featured: true,
      heroEyebrow: 'E-Course Gratis 7 Hari',
      shortOutcome: 'Temukan gaya belajar alami anak hanya dalam 7 hari',
      durationLabel: '7 Hari',
      learningOutcomes: [
        { title: 'Memahami 5 Mesin Kecerdasan', description: 'Kenali perbedaan Sensing, Thinking, Intuiting, Feeling, dan Insting.' },
        { title: 'Pola Komunikasi Efektif', description: 'Cara berbicara dengan anak tanpa memicu tantrum atau perlawanan.' },
        { title: 'Rekomendasi Metode Belajar', description: 'Strategi belajar yang sesuai dengan cara otak anak menyerap informasi.' },
      ],
    },
    {
      programId: p2.id,
      coverVariant: 'cover-b',
      featured: true,
      heroEyebrow: 'Program Flagship',
      shortOutcome: 'Panduan lengkap mendampingi tumbuh kembang anak berbasis genetik',
      durationLabel: '4 Minggu',
      learningOutcomes: [
        { title: 'Analisis Genetik Komprehensif', description: 'Memetakan kekuatan dan kelemahan alami anak secara presisi.' },
        { title: 'Manajemen Emosi Pengasuhan', description: 'Mengatasi rasa lelah dan frustrasi dalam pengasuhan sehari-hari.' },
        { title: 'Rencana Pengembangan Minat & Bakat', description: 'Menyusun peta jalan pendidikan anak sejak usia dini.' },
      ],
    },
    {
      programId: p3.id,
      coverVariant: 'cover-c',
      featured: false,
      heroEyebrow: 'Habit Challenge',
      shortOutcome: 'Bentuk disiplin belajar mandiri anak tanpa perlu disuruh-suruh',
      durationLabel: '30 Hari',
      learningOutcomes: [
        { title: 'Rutin Harian Terstruktur', description: 'Membuat jadwal belajar yang disukai dan dipatuhi anak.' },
        { title: 'Gamifikasi Belajar', description: 'Ubah suasana belajar menjadi petualangan yang seru dan menantang.' },
      ],
    },
    {
      programId: p4.id,
      coverVariant: 'cover-a',
      featured: false,
      heroEyebrow: 'Khusus Alumni Klien',
      shortOutcome: 'Sesi pendalaman dan evaluasi berkala pasca tes STIFIn',
      durationLabel: 'Fleksibel',
      learningOutcomes: [
        { title: 'Evaluasi Pola Asuh Rumah', description: 'Review implementasi rekomendasi tes STIFIn di rumah.' },
      ],
    },
  ];

  for (const pres of presentationsData) {
    const [existing] = await db
      .select()
      .from(programPresentations)
      .where(eq(programPresentations.programId, pres.programId))
      .limit(1);

    if (existing) {
      await db
        .update(programPresentations)
        .set(pres)
        .where(eq(programPresentations.id, existing.id));
    } else {
      await db.insert(programPresentations).values(pres);
    }
  }
  console.log('✓ Program Presentations configured');

  // 6. Multi-Tier Price Variants for Program 2 & 3
  console.log('Seeding Price Variants...');
  const variantsData = [
    {
      programId: p2.id,
      label: 'Paket Basic (Materi Video & E-Workbook)',
      description: 'Akses seluruh video pembelajaran 12 modul & materi e-workbook eksklusif seumur hidup.',
      priceAmount: 199000,
      isDefault: true,
      sortOrder: 1,
    },
    {
      programId: p2.id,
      label: 'Paket Lengkap + Tes STIFIn (Best Seller)',
      description: 'Akses materi lengkap + 1 voucher tes STIFIn resmi (tatap muka / online) + laporan hasil komprehensif.',
      priceAmount: 499000,
      isDefault: false,
      sortOrder: 2,
    },
    {
      programId: p2.id,
      label: 'Paket VIP Family Konseling',
      description: 'Akses materi + 4 voucher tes STIFIn seluruh keluarga + 60 menit sesi konsultasi privat 1-on-1 bersama Promotor Rina.',
      priceAmount: 999000,
      isDefault: false,
      sortOrder: 3,
    },
    {
      programId: p3.id,
      label: 'Akses Tantangan 30 Hari + Komunitas',
      description: 'Akses materi harian tantangan 30 hari + grup pendampingan WhatsApp.',
      priceAmount: 249000,
      isDefault: true,
      sortOrder: 1,
    },
  ];

  for (const v of variantsData) {
    const [existing] = await db
      .select()
      .from(programPriceVariants)
      .where(and(eq(programPriceVariants.programId, v.programId), eq(programPriceVariants.label, v.label)))
      .limit(1);

    if (!existing) {
      await db.insert(programPriceVariants).values({
        organizationId: orgId,
        ...v,
      });
    }
  }
  console.log('✓ Multi-tier price variants seeded');

  // 7. Modules & Lessons for Program 2
  console.log('Seeding Modules & Lessons for Mentoring STIFIn Parenting...');
  const [existingP2Mod] = await db
    .select()
    .from(modules)
    .where(eq(modules.programId, p2.id))
    .limit(1);

  if (!existingP2Mod) {
    const [m1] = await db
      .insert(modules)
      .values({
        programId: p2.id,
        title: 'Modul 1: Membaca Cetak Biru Genetik Anak',
        order: 1,
      })
      .returning();

    await db.insert(lessons).values([
      {
        moduleId: m1.id,
        title: 'Sesi 1: Rahasia 5 Mesin Kecerdasan (STIFIn Overview)',
        order: 1,
        isRequired: true,
        textContent: 'Pemahaman mendalam tentang lapisan otak dominan dan pengaruhnya pada respon emosi anak.',
        videoProvider: 'youtube',
        videoUrl: 'https://www.youtube.com/watch?v=p31ucD7z0sg',
        videoExternalId: 'p31ucD7z0sg',
        reflectionType: 'long_text',
        reflectionPrompt: 'Ceritakan tantangan terbesar yang sering Anda hadapi saat membimbing anak belajar:',
      },
      {
        moduleId: m1.id,
        title: 'Sesi 2: Menghilangkan Label Negatif pada Anak',
        order: 2,
        isRequired: true,
        textContent: 'Anak yang tidak bisa diam bukan nakal, mereka mungkin Sensing. Anak yang banyak bertanya bukan membantah, mereka mungkin Thinking.',
        videoProvider: 'youtube',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoExternalId: 'dQw4w9WgXcQ',
        reflectionType: 'long_text',
        reflectionPrompt: 'Label apa yang pernah secara tidak sadar Anda berikan kepada anak?',
        ctaType: 'WHATSAPP',
        ctaLabel: 'Jadwalkan Konsultasi Hasil Tes via WhatsApp',
        ctaConfig: { url: 'https://wa.me/6281234567890?text=Halo%20Kak%20Rina,%20saya%20ingin%20jadwalkan%20tes%20STIFIn' },
      },
    ]);

    const [m2] = await db
      .insert(modules)
      .values({
        programId: p2.id,
        title: 'Modul 2: Strategi Komunikasi Tanpa Emosi',
        order: 2,
      })
      .returning();

    await db.insert(lessons).values([
      {
        moduleId: m2.id,
        title: 'Sesi 3: Kalimat Sakti untuk Anak Feeling dan Insting',
        order: 1,
        isRequired: true,
        textContent: 'Teknik validasi perasaan anak sebelum memberikan arahan atau aturan.',
        videoProvider: 'youtube',
        videoUrl: 'https://www.youtube.com/watch?v=p31ucD7z0sg',
        videoExternalId: 'p31ucD7z0sg',
        reflectionType: 'long_text',
        reflectionPrompt: 'Bagaimana reaksi anak saat Anda memuji usahanya dibandingkan hasil akhirnya?',
      },
    ]);
    console.log('✓ Modules & lessons created for Program 2');
  }

  // 8. Promo Coupons
  console.log('Seeding Promo Coupons...');
  const couponsData = [
    {
      code: 'DISKON50',
      discountType: 'PERCENT',
      discountValue: 50,
      maxRedemptions: 100,
      usedCount: 14,
      isActive: true,
      programId: p2.id,
    },
    {
      code: 'AYAHHEBAT',
      discountType: 'FIXED',
      discountValue: 50000,
      maxRedemptions: 50,
      usedCount: 8,
      isActive: true,
      programId: null,
    },
    {
      code: 'EARLYBIRD',
      discountType: 'PERCENT',
      discountValue: 20,
      maxRedemptions: 30,
      usedCount: 12,
      isActive: true,
      programId: p3.id,
    },
    {
      code: 'STIFINFAMILY',
      discountType: 'FIXED',
      discountValue: 150000,
      maxRedemptions: 20,
      usedCount: 5,
      isActive: true,
      programId: p2.id,
    },
  ];

  for (const c of couponsData) {
    const [existing] = await db
      .select()
      .from(promoCoupons)
      .where(and(eq(promoCoupons.organizationId, orgId), eq(promoCoupons.code, c.code)))
      .limit(1);

    if (!existing) {
      await db.insert(promoCoupons).values({
        organizationId: orgId,
        ...c,
      });
    }
  }
  console.log('✓ Promo Coupons seeded (DISKON50, AYAHHEBAT, EARLYBIRD, STIFINFAMILY)');

  // 9. Contacts & Learners (Ayu, Nina, Budi, Dewi, Hendra, Siti)
  console.log('Seeding Contacts & Diverse Learners...');
  const contactsData = [
    {
      name: 'Ayu Lestari',
      phoneE164: '+6281987654321',
      stage: 'FOLLOW_UP',
      classification: 'PROSPECT',
      interest: 'Tes STIFIn Keluarga',
      sourceChannel: 'WHATSAPP',
      notes: 'Berminat tes untuk 2 anaknya bulan ini. Mengamati anak pertama Sensing dan kedua Thinking.',
    },
    {
      name: 'Nina Rahmawati',
      phoneE164: '+6285678901234',
      stage: 'INTERESTED',
      classification: 'PROSPECT',
      interest: 'Sensing vs Thinking',
      sourceChannel: 'STOREFRONT',
      notes: 'Aktif bertanya di kolom refleksi tentang metode belajar anak aktif.',
    },
    {
      name: 'Budi Santoso',
      phoneE164: '+6281298765432',
      stage: 'COMPLETED',
      classification: 'CLIENT',
      interest: 'Parenting Selesai',
      sourceChannel: 'STOREFRONT',
      notes: 'Sudah menyelesaikan e-course 100% dan terbit sertifikat kelulusan resmi.',
    },
    {
      name: 'Dewi Sartika',
      phoneE164: '+6281311223344',
      stage: 'CONTACTED',
      classification: 'PROSPECT',
      interest: 'Mentoring STIFIn Parenting',
      sourceChannel: 'STOREFRONT',
      notes: 'Terhenti di sesi 1 lebih dari 4 hari, butuh sapaan pengingat belajar via WhatsApp.',
    },
    {
      name: 'Hendra Wijaya',
      phoneE164: '+6281755667788',
      stage: 'BOOKED',
      classification: 'CLIENT',
      interest: 'Tantangan 30 Hari',
      sourceChannel: 'WHATSAPP',
      notes: 'Sudah mendaftar tantangan 30 hari kebiasaan belajar anak.',
    },
    {
      name: 'Siti Nurhaliza',
      phoneE164: '+6281899001122',
      stage: 'NEW',
      classification: 'PROSPECT',
      interest: 'Baru Mendaftar',
      sourceChannel: 'STOREFRONT',
      notes: 'Lead baru masuk dari landing page kemarin sore.',
    },
  ];

  const contactMap = new Map<string, string>(); // name -> contactId

  for (const cd of contactsData) {
    let [c] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.organizationId, orgId), eq(contacts.phoneE164, cd.phoneE164)))
      .limit(1);

    if (!c) {
      [c] = await db
        .insert(contacts)
        .values({
          organizationId: orgId,
          name: cd.name,
          phoneE164: cd.phoneE164,
        })
        .returning();
    }
    contactMap.set(cd.name, c.id);

    // Contact Flow State
    const [existingState] = await db
      .select()
      .from(contactFlowStates)
      .where(eq(contactFlowStates.contactId, c.id))
      .limit(1);

    if (!existingState) {
      await db.insert(contactFlowStates).values({
        organizationId: orgId,
        contactId: c.id,
        stage: cd.stage,
        classification: cd.classification,
        interest: cd.interest,
        sourceChannel: cd.sourceChannel,
        notes: cd.notes,
      });
    }
  }
  console.log('✓ Contacts and Pipeline Stages seeded');

  // 10. Enrollments
  console.log('Seeding Enrollments...');
  const enrollmentsData = [
    {
      contactName: 'Ayu Lestari',
      programId: p1.id,
      status: 'STARTED',
      learningStatus: 'IN_PROGRESS',
      progressPercent: 33,
      intentScore: 85,
      intentLabel: 'HOT',
    },
    {
      contactName: 'Nina Rahmawati',
      programId: p1.id,
      status: 'STARTED',
      learningStatus: 'IN_PROGRESS',
      progressPercent: 66,
      intentScore: 55,
      intentLabel: 'WARM',
    },
    {
      contactName: 'Budi Santoso',
      programId: p1.id,
      status: 'COMPLETED',
      learningStatus: 'COMPLETED',
      progressPercent: 100,
      intentScore: 95,
      intentLabel: 'HOT',
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      contactName: 'Dewi Sartika',
      programId: p2.id,
      status: 'STARTED',
      learningStatus: 'AT_RISK',
      progressPercent: 15,
      intentScore: 75,
      intentLabel: 'WARM',
      lastActivityAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      contactName: 'Hendra Wijaya',
      programId: p3.id,
      status: 'STARTED',
      learningStatus: 'IN_PROGRESS',
      progressPercent: 50,
      intentScore: 70,
      intentLabel: 'WARM',
    },
    {
      contactName: 'Siti Nurhaliza',
      programId: p2.id,
      status: 'ENROLLED',
      learningStatus: 'NOT_STARTED',
      progressPercent: 0,
      intentScore: 30,
      intentLabel: 'COLD',
    },
  ];

  const enrollmentMap = new Map<string, string>(); // contactName -> enrollmentId

  for (const ed of enrollmentsData) {
    const contactId = contactMap.get(ed.contactName)!;
    let [enr] = await db
      .select()
      .from(enrollments)
      .where(and(eq(enrollments.contactId, contactId), eq(enrollments.programId, ed.programId)))
      .limit(1);

    if (!enr) {
      [enr] = await db
        .insert(enrollments)
        .values({
          organizationId: orgId,
          contactId,
          programId: ed.programId,
          status: ed.status,
          learningStatus: ed.learningStatus,
          progressPercent: ed.progressPercent,
          intentScore: ed.intentScore,
          intentLabel: ed.intentLabel,
          completedAt: ed.completedAt,
          lastActivityAt: ed.lastActivityAt,
        })
        .returning();
    } else {
      await db
        .update(enrollments)
        .set({
          status: ed.status,
          learningStatus: ed.learningStatus,
          progressPercent: ed.progressPercent,
          intentScore: ed.intentScore,
          intentLabel: ed.intentLabel,
          completedAt: ed.completedAt,
          lastActivityAt: ed.lastActivityAt,
        })
        .where(eq(enrollments.id, enr.id));
    }
    enrollmentMap.set(ed.contactName, enr.id);
  }
  console.log('✓ Diverse Enrollments seeded');

  // 11. Certificates for Budi Santoso
  console.log('Seeding Certificate for Budi Santoso...');
  const budiEnrId = enrollmentMap.get('Budi Santoso')!;
  const [existingCert] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.enrollmentId, budiEnrId))
    .limit(1);

  if (!existingCert) {
    await db.insert(certificates).values({
      organizationId: orgId,
      enrollmentId: budiEnrId,
      serial: 'STIFIN-2026-CERT-001',
      recipientName: 'Budi Santoso',
      programTitle: '7 Hari Mengenal Cara Belajar Anak',
      promoterName: 'Rina Promotor',
    });
    console.log('✓ Certificate STIFIN-2026-CERT-001 generated');
  }

  // 12. Learning Signals (Ayu: HOT, Dewi: AT_RISK Inactive)
  console.log('Seeding Learning Signals...');
  const dewiContactId = contactMap.get('Dewi Sartika')!;
  const dewiEnrId = enrollmentMap.get('Dewi Sartika')!;

  const [existingDewiSig] = await db
    .select()
    .from(learningSignals)
    .where(eq(learningSignals.contactId, dewiContactId))
    .limit(1);

  if (!existingDewiSig) {
    await db.insert(learningSignals).values({
      organizationId: orgId,
      contactId: dewiContactId,
      programId: p2.id,
      enrollmentId: dewiEnrId,
      type: 'LEARNER_INACTIVE',
      priority: 90,
      reason: 'Peserta terhenti lebih dari 4 hari pada Sesi 1 Modul 1',
      recommendedActionType: 'WHATSAPP_NUDGE',
      recommendedActionReason: 'Kirim broadcast pengingat belajar 1-tap agar peserta termotivasi melanjutkan materi',
      status: 'ACTIVE',
    });
    console.log('✓ Inactive/At-risk signal seeded for Dewi Sartika');
  }

  // 13. Learner Lesson Notes
  console.log('Seeding Learner Lesson Notes...');
  const ayuEnrId = enrollmentMap.get('Ayu Lestari')!;
  const [firstP1Lesson] = await db.select().from(lessons).where(eq(lessons.moduleId, (await db.select().from(modules).where(eq(modules.programId, p1.id)).limit(1))[0].id)).limit(1);

  if (firstP1Lesson) {
    const [existingNote] = await db
      .select()
      .from(learnerLessonNotes)
      .where(and(eq(learnerLessonNotes.enrollmentId, ayuEnrId), eq(learnerLessonNotes.lessonId, firstP1Lesson.id)))
      .limit(1);

    if (!existingNote) {
      await db.insert(learnerLessonNotes).values({
        organizationId: orgId,
        enrollmentId: ayuEnrId,
        lessonId: firstP1Lesson.id,
        body: 'Catatan pribadi: Anak pertama (Rafi, 8 th) sangat aktif, suka eksperimen langsung. Tampaknya dominan Sensing. Anak kedua (Alya, 5 th) banyak bertanya logis sebab-akibat, cenderung Thinking.',
      });
      console.log('✓ Learner lesson note created for Ayu');
    }
  }

  // 14. Commerce Orders & Payment Records
  console.log('Seeding Commerce Orders & Revenue...');
  const ordersData = [
    {
      reference: 'ORD-2026-001',
      contactName: 'Budi Santoso',
      programId: p2.id,
      amount: 999000,
      status: 'PAID',
      paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      reference: 'ORD-2026-002',
      contactName: 'Ayu Lestari',
      programId: p2.id,
      amount: 499000,
      status: 'PAID',
      paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      reference: 'ORD-2026-003',
      contactName: 'Hendra Wijaya',
      programId: p3.id,
      amount: 249000,
      status: 'PAID',
      paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      reference: 'ORD-2026-004',
      contactName: 'Nina Rahmawati',
      programId: p2.id,
      amount: 199000,
      status: 'PAID',
      paidAt: new Date().toISOString(),
    },
    {
      reference: 'ORD-2026-005',
      contactName: 'Dewi Sartika',
      programId: p2.id,
      amount: 199000,
      status: 'PENDING',
      paidAt: null,
    },
  ];

  for (const od of ordersData) {
    const contactId = contactMap.get(od.contactName)!;
    const [existingOrder] = await db
      .select()
      .from(commerceOrders)
      .where(eq(commerceOrders.reference, od.reference))
      .limit(1);

    if (!existingOrder) {
      const [order] = await db
        .insert(commerceOrders)
        .values({
          organizationId: orgId,
          contactId,
          programId: od.programId,
          reference: od.reference,
          orderType: 'PROGRAM_PURCHASE',
          sourceChannel: 'STOREFRONT',
          paymentMode: 'PAYCORE',
          amount: od.amount,
          currency: 'IDR',
          status: od.status,
          paidAt: od.paidAt,
          approvedAt: od.status === 'PAID' ? od.paidAt : null,
        })
        .returning();

      if (od.status === 'PAID') {
        await db.insert(paymentRecords).values({
          organizationId: orgId,
          orderId: order.id,
          provider: 'PAYCORE',
          grossAmount: od.amount,
          currency: 'IDR',
          status: 'SUCCESS',
        });
      }
    }
  }
  console.log('✓ Commerce orders & payment records created (Total revenue Rp 1.946.000)');

  // 15. Message Templates
  console.log('Seeding Message Templates...');
  const templatesData = [
    {
      title: 'Sapaan Ramah Peserta Baru',
      category: 'CONTACT_LEAD',
      templateText: 'Halo Ayah/Bunda {{nama}}! 👋 Terima kasih sudah mendaftar di program {{program}}. Senang bisa mendampingi proses belajar keluarga. Ada yang ingin ditanyakan sebelum mulai materinya?',
      tone: 'friendly',
    },
    {
      title: 'Follow-up Refleksi Gaya Belajar',
      category: 'FOLLOW_UP',
      templateText: 'Halo Kak {{nama}}, saya sudah membaca refleksi menarik yang Kakak tulis di Sesi {{sesi}}. Pengamatan Kakak sangat tajam! Bagaimana kalau kita diskusikan potensi tes STIFIn anak lebih lanjut?',
      tone: 'professional',
    },
    {
      title: 'Pengingat Belajar (Nudge 1-Tap)',
      category: 'REMIND_BOOKING',
      templateText: 'Halo Kak {{nama}} 😊 Semangat belajarnya! Terakhir Kakak berhenti di materi "{{program}}". Materinya seru dan tinggal sedikit lagi lho ✨ Yuk lanjut: {{link}}',
      tone: 'friendly',
    },
    {
      title: 'Penawaran Sesi Konsultasi Keluarga',
      category: 'FOLLOW_UP',
      templateText: 'Kabar baik Ayah/Bunda {{nama}}! Khusus peserta e-course, pekan ini kami membuka 3 kuota sesi konsultasi privat 1-on-1 bersama Promotor STIFIn berlisensi. Apakah Ayah/Bunda tertarik mengambil kuota tersebut?',
      tone: 'persuasive',
    },
  ];

  for (const t of templatesData) {
    const [existing] = await db
      .select()
      .from(messageTemplates)
      .where(and(eq(messageTemplates.organizationId, orgId), eq(messageTemplates.title, t.title)))
      .limit(1);

    if (!existing) {
      await db.insert(messageTemplates).values({
        organizationId: orgId,
        ...t,
      });
    }
  }
  console.log('✓ Message templates seeded');

  // 16. Activities
  console.log('Seeding Activity Logs...');
  const activitiesData = [
    {
      contactName: 'Ayu Lestari',
      eventType: 'CLASS_SIGNAL',
      metadataJson: { message: 'Sinyal Minat Tinggi terdeteksi dari refleksi mendalam' },
    },
    {
      contactName: 'Ayu Lestari',
      eventType: 'WHATSAPP_SENT',
      metadataJson: { message: 'Kirim sapaan tindak lanjut hasil refleksi sesi 1' },
    },
    {
      contactName: 'Budi Santoso',
      eventType: 'PAYMENT_MARKED',
      metadataJson: { message: 'Pembayaran Paket VIP Rp 999.000 lunas terverifikasi' },
    },
    {
      contactName: 'Budi Santoso',
      eventType: 'STAGE_CHANGED',
      metadataJson: { from: 'BOOKED', to: 'COMPLETED' },
    },
    {
      contactName: 'Dewi Sartika',
      eventType: 'CONTACT_CREATED',
      metadataJson: { source: 'Storefront landing page' },
    },
  ];

  for (const act of activitiesData) {
    const contactId = contactMap.get(act.contactName)!;
    await db.insert(activities).values({
      organizationId: orgId,
      contactId,
      eventType: act.eventType,
      metadataJson: act.metadataJson,
    });
  }
  console.log('✓ Activities logged');

  // 17. Services (Konsultasi & Tes STIFIn)
  console.log('Seeding Consultation & Assessment Services...');
  const servicesData = [
    {
      name: 'Tes STIFIn Personal (1 Orang)',
      description: 'Tes sidik jari biometrik resmi STIFIn untuk mengungkap mesin kecerdasan dominan dan drive kecerdasan.',
      category: 'ASSESSMENT',
      priceAmount: 350000,
      durationMinutes: 45,
      isActive: true,
    },
    {
      name: 'Tes STIFIn Paket Keluarga Inti (4 Orang)',
      description: 'Pemetaan genetik lengkap untuk Ayah, Ibu, dan 2 Anak. Termasuk grafik hubungan interaksi keluarga.',
      category: 'ASSESSMENT',
      priceAmount: 1200000,
      durationMinutes: 90,
      isActive: true,
    },
    {
      name: 'Sesi Privat Konsultasi Parenting 1-on-1',
      description: 'Konsultasi privat via Zoom / tatap muka 60 menit membahas strategi pengasuhan spesifik anak.',
      category: 'SESSION',
      priceAmount: 500000,
      durationMinutes: 60,
      isActive: true,
    },
  ];

  for (const s of servicesData) {
    const [existing] = await db
      .select()
      .from(services)
      .where(and(eq(services.organizationId, orgId), eq(services.name, s.name)))
      .limit(1);

    if (!existing) {
      await db.insert(services).values({
        organizationId: orgId,
        ...s,
      });
    }
  }
  console.log('✓ Services seeded');

  await client.end();
  console.log('=== COMPREHENSIVE PRODUCTION DEMO SEED COMPLETED 100% ===');
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
