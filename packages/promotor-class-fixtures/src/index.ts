import {
  Organization,
  User,
  Contact,
  Program,
  Enrollment,
  Reflection,
  LearningSignal,
  LearningActivityProjection,
} from '@promotor/contracts';

export const SEED_ORGANIZATION: Organization = {
  id: 'org_rina_stifin',
  name: 'Rina Parenting & STIFIn Center',
  slug: 'rina',
  createdAt: '2026-01-01T00:00:00Z',
};

export const SEED_PROMOTOR_USER: User = {
  id: 'user_rina',
  name: 'Rina Wulandari',
  email: 'rina@stifinpromotor.id',
  phone: '+6281234567890',
  organizationId: 'org_rina_stifin',
};

export const SEED_CONTACTS: Contact[] = [
  {
    id: 'contact_ayu',
    organizationId: 'org_rina_stifin',
    name: 'Ayu Lestari',
    phone: '+6281987654321',
    email: 'ayu.lestari@gmail.com',
    notes: 'Ibu 2 anak, berminat memahami karakter gaya belajar anak pertamanya.',
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'contact_nina',
    organizationId: 'org_rina_stifin',
    name: 'Nina Rahmawati',
    phone: '+6281876543210',
    email: 'nina.rahma@yahoo.com',
    notes: 'Mengeluhkan anak sering ketagihan HP dan sulit diajak komunikasi.',
    createdAt: '2026-08-05T14:30:00Z',
  },
  {
    id: 'contact_budi',
    organizationId: 'org_rina_stifin',
    name: 'Budi Santoso',
    phone: '+6281765432109',
    email: 'budi.santoso@outlook.com',
    notes: 'Sudah tes STIFIn Sensing, ingin lanjut mendampingi belajar anak.',
    createdAt: '2026-08-08T09:15:00Z',
  },
];

export const SEED_PROGRAMS: Program[] = [
  {
    id: 'prog_7_hari_belajar',
    organizationId: 'org_rina_stifin',
    title: '7 Hari Mengenal Cara Belajar Anak',
    subtitle: 'Panduan Praktis Orang Tua Mengidentifikasi Mesin Kecerdasan Anak',
    description: 'Program edukasi 7 hari untuk mengamati pola respon dan cara belajar terbaik anak di rumah.',
    category: 'Parenting & Education',
    isPublished: true,
    priceType: 'free',
    workspaceSlug: 'rina',
    programSlug: '7-hari-mengenal-cara-belajar-anak',
    createdAt: '2026-08-01T08:00:00Z',
    updatedAt: '2026-08-10T12:00:00Z',
    modules: [
      {
        id: 'mod_1',
        programId: 'prog_7_hari_belajar',
        title: 'Modul 1: Memahami Pola Respon Anak',
        order: 1,
        lessons: [
          {
            id: 'les_1_1',
            moduleId: 'mod_1',
            title: 'Hari 1: Mengamati Karakter Utama saat Belajar',
            order: 1,
            videoYoutubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            textContent: 'Setiap anak memiliki cara unik dalam menerima informasi. Ada yang lebih cepat memahami lewat visual, pendengaran, maupun gerak fisik.',
            attachments: [
              {
                id: 'att_1',
                name: 'Lembar-kerja-pola-belajar.pdf',
                url: '/files/lembar-kerja.pdf',
                sizeFormatted: '1.2 MB',
                fileType: 'pdf',
              },
            ],
            hasReflection: true,
            reflectionPrompt: 'Tuliskan 1 hal yang paling menonjol saat anak Anda belajar hari ini:',
            hasCta: false,
          },
          {
            id: 'les_1_2',
            moduleId: 'mod_1',
            title: 'Hari 2: Menangani Konflik Penggunaan HP',
            order: 2,
            videoYoutubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            textContent: 'Penggunaan gawai sering kali menjadi sumber ketegangan di rumah jika tidak dibarengi dengan kesepakatan batas waktu yang tepat.',
            hasReflection: true,
            reflectionPrompt: 'Apa kendala utama yang sering terjadi saat Anda mencoba membatasi waktu main HP anak?',
            hasCta: true,
            ctaLabel: 'Konsultasi Hasil via WhatsApp',
            ctaUrl: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Rina,%20saya%20ingin%20konsultasi',
          },
        ],
      },
      {
        id: 'mod_2',
        programId: 'prog_7_hari_belajar',
        title: 'Modul 2: Rencana Tindakan Rumah',
        order: 2,
        lessons: [
          {
            id: 'les_2_1',
            moduleId: 'mod_2',
            title: 'Hari 3: Rencana Tindakan Pendampingan',
            order: 1,
            textContent: 'Merumuskan 3 aturan sederhana untuk menemani anak belajar tanpa kemarahan.',
            hasReflection: true,
            reflectionPrompt: 'Tuliskan 3 komitmen belajar bersama anak minggu ini:',
            hasCta: true,
            ctaLabel: 'Jadwalkan Tes STIFIn Anak',
            ctaUrl: 'https://wa.me/6281234567890?text=Halo%20Mbak%20Rina,%20saya%20mau%20booking%20Tes%20STIFIn',
          },
        ],
      },
    ],
  },
];

export const SEED_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enr_ayu_7hari',
    contactId: 'contact_ayu',
    programId: 'prog_7_hari_belajar',
    status: 'selesai',
    progressPercent: 100,
    startedAt: '2026-08-02T09:00:00Z',
    completedAt: '2026-08-12T10:00:00Z',
    lastActiveAt: '2026-08-12T10:00:00Z',
    lessonProgress: {
      les_1_1: { lessonId: 'les_1_1', completed: true, completedAt: '2026-08-02T10:00:00Z', reflectionAnswer: 'Anak saya sangat aktif dan mudah bosan kalau hanya diminta membaca teks.' },
      les_1_2: { lessonId: 'les_1_2', completed: true, completedAt: '2026-08-05T11:00:00Z', reflectionAnswer: 'Kalau sudah main HP susah berhenti dan sering mengamuk.' },
      les_2_1: { lessonId: 'les_2_1', completed: true, completedAt: '2026-08-12T10:00:00Z', reflectionAnswer: 'Saya berkomitmen membatasi HP 1 jam per hari dan rutin mendampingi belajar jam 7 malam.' },
    },
  },
  {
    id: 'enr_nina_7hari',
    contactId: 'contact_nina',
    programId: 'prog_7_hari_belajar',
    status: 'aktif',
    progressPercent: 66,
    startedAt: '2026-08-06T14:00:00Z',
    lastActiveAt: '2026-08-12T08:30:00Z',
    lessonProgress: {
      les_1_1: { lessonId: 'les_1_1', completed: true, completedAt: '2026-08-06T15:00:00Z', reflectionAnswer: 'Anak saya lebih suka mendengarkan cerita daripada membaca buku sendiri.' },
      les_1_2: { lessonId: 'les_1_2', completed: true, completedAt: '2026-08-12T08:30:00Z', reflectionAnswer: 'Penggunaan HP sering memicu konflik saat jam belajar.' },
    },
  },
];

export const SEED_REFLECTIONS: Reflection[] = [
  {
    id: 'refl_ayu_1',
    enrollmentId: 'enr_ayu_7hari',
    lessonId: 'les_2_1',
    answerText: 'Saya berkomitmen membatasi HP 1 jam per hari dan rutin mendampingi belajar jam 7 malam.',
    createdAt: '2026-08-12T10:00:00Z',
  },
  {
    id: 'refl_nina_1',
    enrollmentId: 'enr_nina_7hari',
    lessonId: 'les_1_2',
    answerText: 'Penggunaan HP sering memicu konflik saat jam belajar.',
    createdAt: '2026-08-12T08:30:00Z',
  },
];

export const SEED_SIGNALS: LearningSignal[] = [
  {
    id: 'sig_ayu_completed',
    contactId: 'contact_ayu',
    enrollmentId: 'enr_ayu_7hari',
    programId: 'prog_7_hari_belajar',
    minatStatus: 'Minat tinggi',
    primaryReason: 'Program selesai',
    rawQuoteSnippet: 'Saya berkomitmen membatasi HP 1 jam per hari...',
    intentScoreNumeric: 92,
    createdAt: '2026-08-12T10:00:00Z',
  },
  {
    id: 'sig_nina_hp_conflict',
    contactId: 'contact_nina',
    enrollmentId: 'enr_nina_7hari',
    programId: 'prog_7_hari_belajar',
    minatStatus: 'Minat sedang',
    primaryReason: 'Refleksi menyebut konflik penggunaan HP',
    rawQuoteSnippet: 'Penggunaan HP sering memicu konflik...',
    intentScoreNumeric: 74,
    createdAt: '2026-08-12T08:30:00Z',
  },
];

export const SEED_ACTIVITY_LOGS: LearningActivityProjection[] = [
  {
    id: 'act_1',
    contactId: 'contact_ayu',
    learnerName: 'Ayu Lestari',
    activitySummary: 'Ayu menyelesaikan Rencana Tindakan Pendampingan',
    timeAgoFormatted: '03:01',
    timestamp: '2026-08-12T10:00:00Z',
  },
  {
    id: 'act_2',
    contactId: 'contact_nina',
    learnerName: 'Nina Rahmawati',
    activitySummary: 'Nina mengisi refleksi pada Menangani Konflik HP',
    timeAgoFormatted: '02:44',
    timestamp: '2026-08-12T08:30:00Z',
  },
];
