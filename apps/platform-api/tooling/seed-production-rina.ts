import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { provisionPromotorUser } from '../src/auth/provisioning';
import {
  organizations,
  productEntitlements,
  organizationSubscriptions,
  workspaceProfiles,
  programs,
  modules,
  lessons,
  contacts,
  enrollments,
  lessonProgress,
  reflectionResponses,
  learningSignals,
} from '../src/db/schema';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in environment!');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  const db = drizzle(client);

  console.log('--- SEEDING RINA PROMOTOR ON PRODUCTION ---');

  // 1. Check if organization "rina" exists
  const existingOrg = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, 'rina'))
    .limit(1);

  let orgId: string | undefined = existingOrg[0]?.id;

  if (!orgId) {
    console.log('Provisioning Rina promotor user and organization...');
    const provisioned = await provisionPromotorUser(db, {
      name: 'Rina Promotor',
      email: 'rina@stifin.id',
      password: 'password123',
      organizationName: 'STIFIn Promotor',
      organizationSlug: 'rina',
    });
    orgId = provisioned.organizationId;
    console.log('✓ User and organization provisioned. Org ID:', orgId);
  } else {
    console.log('Organization "rina" already exists. Org ID:', orgId);
  }

  if (!orgId) {
    throw new Error('Organization ID is missing after provisioning');
  }

  // 2. Set product entitlements
  console.log('Updating product entitlements...');
  await db
    .update(productEntitlements)
    .set({ promotorClass: true, promotorFlow: true })
    .where(eq(productEntitlements.organizationId, orgId));
  console.log('✓ Entitlements set (promotorClass=true, promotorFlow=true)');

  // 3. Organization subscription
  const existingSub = await db
    .select()
    .from(organizationSubscriptions)
    .where(eq(organizationSubscriptions.organizationId, orgId))
    .limit(1);

  if (existingSub.length === 0) {
    console.log('Inserting SOLO subscription...');
    await db.insert(organizationSubscriptions).values({
      organizationId: orgId,
      planCode: 'SOLO',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      provider: 'NONE',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    });
    console.log('✓ Subscription inserted');
  }

  // 4. Workspace profile
  const existingProfile = await db
    .select()
    .from(workspaceProfiles)
    .where(eq(workspaceProfiles.organizationId, orgId))
    .limit(1);

  if (existingProfile.length === 0) {
    console.log('Inserting workspace profile...');
    await db.insert(workspaceProfiles).values({
      organizationId: orgId,
      displayName: 'STIFIn Promotor',
      headline: 'Promotor Resmi STIFIn',
      tagline: 'Membantu keluarga memahami potensi genetik anak',
      bio: 'Praktisi dan konsultan STIFIn berpengalaman dalam pemetaan potensi dan bakat.',
      city: 'Jakarta',
      roleLabel: 'Licensed Promotor',
      whatsappPhoneE164: '+6281234567890',
      stats: {
        familiesHelped: '100+',
        location: 'Jakarta',
      },
    });
    console.log('✓ Workspace profile created');
  }

  // 5. Seed program "7 Hari Mengenal Cara Belajar Anak"
  let existingProg = await db
    .select()
    .from(programs)
    .where(eq(programs.slug, '7-hari-mengenal-cara-belajar-anak'))
    .limit(1);

  let programId: string | undefined = existingProg[0]?.id;

  if (!programId) {
    console.log('Creating program: 7 Hari Mengenal Cara Belajar Anak...');
    const [prog] = await db
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
    programId = prog.id;

    console.log('Creating modules and lessons...');
    const [mod1] = await db
      .insert(modules)
      .values({
        programId: prog.id,
        title: 'Modul 1: Mengenali Bakat Genetik Anak',
        order: 1,
      })
      .returning();

    const [les1] = await db
      .insert(lessons)
      .values({
        moduleId: mod1.id,
        title: 'Sesi 1: Mengapa Setiap Anak Unik?',
        order: 1,
        isRequired: true,
        textContent: 'Pola belajar anak sangat dipengaruhi oleh mesin kecerdasan dominan yang dibawanya sejak lahir.',
        videoYoutubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        hasReflection: true,
        reflectionType: 'long_text',
        reflectionPrompt: 'Tuliskan pengamatan Anda tentang kebiasaan belajar anak yang paling menonjol:',
      })
      .returning();

    const [les2] = await db
      .insert(lessons)
      .values({
        moduleId: mod1.id,
        title: 'Sesi 2: Ciri-Ciri Anak Mesin Kecerdasan Sensing vs Thinking',
        order: 2,
        isRequired: true,
        textContent: 'Anak Sensing belajar lewat praktik dan memori konkrit, sedangkan anak Thinking belajar lewat skema logika.',
        videoYoutubeUrl: 'https://www.youtube.com/watch?v=p31ucD7z0sg',
        hasReflection: true,
        reflectionType: 'long_text',
        reflectionPrompt: 'Apakah anak Anda lebih cenderung menghafal fakta atau mempertanyakan alasan?',
        hasCta: true,
        ctaLabel: 'Konsultasi Hasil Tes via WhatsApp',
        ctaUrl: 'https://wa.me/6281234567890?text=Saya%20ingin%20konsultasi%20tes%20STIFIn',
      })
      .returning();

    console.log('✓ Program and lessons created');
  }

  // 6. Seed contacts for Ayu Lestari and Nina Rahmawati
  console.log('Checking learner contacts...');
  let ayuContact = await db
    .select()
    .from(contacts)
    .where(eq(contacts.phoneE164, '+6281987654321'))
    .limit(1);

  let ayuContactId = ayuContact[0]?.id;
  if (!ayuContactId) {
    const [c] = await db
      .insert(contacts)
      .values({
        organizationId: orgId,
        name: 'Ayu Lestari',
        phoneE164: '+6281987654321',
      })
      .returning();
    ayuContactId = c.id;
    console.log('✓ Created contact Ayu Lestari');
  }

  let ninaContact = await db
    .select()
    .from(contacts)
    .where(eq(contacts.phoneE164, '+6285678901234'))
    .limit(1);

  let ninaContactId = ninaContact[0]?.id;
  if (!ninaContactId) {
    const [c] = await db
      .insert(contacts)
      .values({
        organizationId: orgId,
        name: 'Nina Rahmawati',
        phoneE164: '+6285678901234',
      })
      .returning();
    ninaContactId = c.id;
    console.log('✓ Created contact Nina Rahmawati');
  }

  // 7. Seed enrollments for Ayu and Nina
  if (programId && ayuContactId) {
    const existingEnr = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.contactId, ayuContactId))
      .limit(1);

    if (existingEnr.length === 0) {
      await db.insert(enrollments).values({
        organizationId: orgId,
        contactId: ayuContactId,
        programId: programId,
        status: 'STARTED',
        learningStatus: 'IN_PROGRESS',
        progressPercent: 33,
        intentScore: 85,
        intentLabel: 'HOT',
      });
      console.log('✓ Created enrollment for Ayu');
    }

    const ayuEnrollment = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.contactId, ayuContactId))
      .limit(1);

    const firstLesson = await db
      .select()
      .from(lessons)
      .limit(1);

    if (ayuEnrollment[0] && firstLesson[0]) {
      const existingRefl = await db
        .select()
        .from(reflectionResponses)
        .where(eq(reflectionResponses.enrollmentId, ayuEnrollment[0].id))
        .limit(1);

      if (existingRefl.length === 0) {
        await db.insert(reflectionResponses).values({
          organizationId: orgId,
          enrollmentId: ayuEnrollment[0].id,
          lessonId: firstLesson[0].id,
          responseText: 'Anak saya yang pertama sangat aktif dan suka sekali belajar sambil bergerak, sedangkan anak kedua lebih tenang dan suka menganalisa. Saya merasa anak pertama cenderung Sensing dan anak kedua Thinking.',
        });
        console.log('✓ Created reflection response for Ayu');
      }

      const existingSig = await db
        .select()
        .from(learningSignals)
        .where(eq(learningSignals.contactId, ayuContactId))
        .limit(1);

      if (existingSig.length === 0) {
        await db.insert(learningSignals).values({
          organizationId: orgId,
          contactId: ayuContactId,
          programId: programId,
          enrollmentId: ayuEnrollment[0].id,
          type: 'HIGH_LEARNING_INTENT',
          priority: 85,
          reason: 'Refleksi mendalam: anak pertama Sensing, anak kedua Thinking',
          recommendedActionType: 'WHATSAPP_REPLY',
          recommendedActionReason: 'Ayu mengamati gaya belajar kedua anaknya dan berpotensi tes STIFIn keluarga',
          status: 'ACTIVE',
        });
        console.log('✓ Created learning signal for Ayu');
      }
    }
  }

  if (programId && ninaContactId) {
    const existingEnr = await db
      .select()
      .from(enrollments)
      .where(eq(enrollments.contactId, ninaContactId))
      .limit(1);

    if (existingEnr.length === 0) {
      await db.insert(enrollments).values({
        organizationId: orgId,
        contactId: ninaContactId,
        programId: programId,
        status: 'STARTED',
        learningStatus: 'IN_PROGRESS',
        progressPercent: 66,
        intentScore: 55,
        intentLabel: 'WARM',
      });
      console.log('✓ Created enrollment for Nina');
    }
  }

  await client.end();
  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
