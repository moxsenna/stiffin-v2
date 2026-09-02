import { MockStateStore } from './mock-state-store';
import { PublicStorefrontRepositoryPort } from '@/modules/public-storefront/ports';
import {
  PublicWorkspaceProfile,
  ProgramPublicPresentation,
  PublicProgramCatalogItem,
  PublicProgramDetail,
  StorefrontTheme,
  UpdateStorefrontThemeRequest,
} from '@/modules/public-storefront/types';
import { TALIRA_DEFAULT_STOREFRONT_THEME } from '@promotor/contracts';

export const MOCK_RINA_PROFILE: PublicWorkspaceProfile = {
  workspaceSlug: 'rina',
  displayName: 'Rina Prameswari',
  tagline: 'Ruang belajar untuk orang tua',
  headline: 'Belajar memahami anak, tanpa membuat rumah jadi ruang kelas.',
  bio: 'Saya membantu orang tua menerjemahkan hasil tes menjadi kebiasaan yang lebih manusiawi di rumah. Anda tidak harus menghafal banyak teori. Yang penting adalah memahami pola, mencoba satu perubahan kecil, lalu melihat apa yang bekerja untuk keluarga Anda.',
  city: 'Surabaya',
  roleLabel: 'Promotor STIFIn',
  heroProgramId: 'prog_7_hari_belajar',
  stats: {
    programCount: '3 Program Aktif',
    location: 'Surabaya',
  },
};

export const MOCK_PRESENTATION_MAP: Record<string, ProgramPublicPresentation> = {
  prog_7_hari_belajar: {
    coverVariant: 'cover-a',
    featured: true,
    heroEyebrow: 'Program Gratis',
    shortOutcome: 'Kenali pola belajar anak dan coba penyesuaian kecil yang terasa di rumah.',
    durationLabel: '7 hari',
    learningOutcomes: [
      {
        title: 'Mengenali pola belajar',
        description: 'Memahami sinyal sederhana ketika anak mudah menerima atau menolak suatu cara belajar.',
      },
      {
        title: 'Mengurangi konflik kecil',
        description: 'Membedakan kapan anak tidak mau, belum siap, atau hanya membutuhkan pendekatan berbeda.',
      },
      {
        title: 'Mencoba pendekatan baru',
        description: 'Mendapat ide praktis yang bisa diuji tanpa mengubah seluruh rutinitas keluarga.',
      },
      {
        title: 'Punya langkah berikutnya',
        description: 'Mengetahui kapan cukup mencoba sendiri dan kapan perlu diskusi atau pendampingan.',
      },
    ],
  },
  prog_30_hari_setelah_tes: {
    coverVariant: 'cover-b',
    featured: false,
    heroEyebrow: 'Khusus Peserta Tes',
    shortOutcome: 'Panduan pendampingan setelah tes agar hasil tidak berhenti sebagai laporan.',
    durationLabel: '30 hari',
    learningOutcomes: [
      {
        title: 'Panduan Pasca-Tes',
        description: 'Langkah praktis menerapkan hasil tes STIFIn dalam keseharian anak.',
      },
      {
        title: 'Menterjemahkan Hasil Laporan',
        description: 'Memahami rekomendasi laporan hasil tes tanpa istilah teknis yang membingungkan.',
      },
    ],
  },
  prog_parenting_growth: {
    coverVariant: 'cover-c',
    featured: false,
    heroEyebrow: 'Program Lanjutan',
    shortOutcome: 'Pendampingan lebih mendalam untuk membangun pola komunikasi keluarga.',
    durationLabel: '8 minggu',
    learningOutcomes: [
      {
        title: 'Pola Komunikasi Keluarga',
        description: 'Membangun ekosistem komunikasi yang saling mendukung antar anggota keluarga.',
      },
      {
        title: 'Penyelarasan Gaya Parenting',
        description: 'Menyelaraskan pendekatan antara ayah dan ibu sesuai gaya kepemimpinan keluarga.',
      },
    ],
  },
};

export class MockPublicStorefrontRepository implements PublicStorefrontRepositoryPort {
  private getPresentation(programId: string, program: { description?: string | null; subtitle?: string | null; pricing?: string | null }): ProgramPublicPresentation {
    const storePresentations = MockStateStore.getState().programPresentations;
    if (storePresentations && storePresentations[programId]) {
      return storePresentations[programId];
    }
    if (MOCK_PRESENTATION_MAP[programId]) {
      return MOCK_PRESENTATION_MAP[programId];
    }
    return {
      coverVariant: 'cover-a',
      featured: false,
      heroEyebrow: program.pricing === 'free' ? 'Program Gratis' : 'Program Berbayar',
      shortOutcome: program.description || program.subtitle || '',
      durationLabel: 'Mandiri',
      learningOutcomes: [
        { title: 'Memahami Konsep Dasar', description: 'Mendapat gambaran utuh materi yang dipelajari.' },
        { title: 'Aplikasi Praktis', description: 'Mencoba penyesuaian kecil di rumah atau kegiatan harian.' },
      ],
    };
  }

  async getPublicWorkspaceProfile(workspaceSlug: string): Promise<PublicWorkspaceProfile | null> {
    const storeProfiles = MockStateStore.getState().workspaceProfiles;
    if (storeProfiles && storeProfiles[workspaceSlug]) {
      return storeProfiles[workspaceSlug];
    }
    if (workspaceSlug !== 'rina') return null;
    return MOCK_RINA_PROFILE;
  }

  async getPublicProgramCatalog(workspaceSlug: string): Promise<PublicProgramCatalogItem[]> {
    if (workspaceSlug !== 'rina') return [];

    const programs = MockStateStore.getState().programs.filter(p => {
      // Exclude draft/unpublished
      if (p.status !== 'published') return false;
      // Exclude private or manual access unless explicitly aftersales
      if (p.accessType === 'private' || p.programType === 'private') return false;
      return true;
    });

    return programs.map(program => {
      const presentation = this.getPresentation(program.id, program);

      const isRegistrationAllowed =
        program.programType === 'lead_magnet' &&
        program.accessType === 'public' &&
        program.pricing === 'free';

      let registrationStatusNotice: string | undefined;
      if (program.programType === 'aftersales') {
        registrationStatusNotice = 'Program ini khusus untuk peserta yang telah menyelesaikan tes STIFIn.';
      } else if (program.programType === 'paid' || program.pricing === 'one_time') {
        registrationStatusNotice = 'Program Berbayar — Hubungi Promotor / Tersedia via Konsultasi.';
      }

      const totalLessonsCount = program.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

      return {
        program: {
          id: program.id,
          workspaceSlug: program.workspaceSlug,
          programSlug: program.programSlug,
          title: program.title,
          subtitle: program.subtitle,
          description: program.description,
          programType: program.programType,
          accessType: program.accessType,
          pricing: program.pricing,
          priceAmount: program.priceAmount,
          publishedAt: program.publishedAt,
          totalModulesCount: program.modules.length,
          totalLessonsCount,
        },
        presentation,
        isRegistrationAllowed,
        registrationStatusNotice,
      };
    });
  }

  async getPublicProgramDetail(
    workspaceSlug: string,
    programSlug: string
  ): Promise<PublicProgramDetail | null> {
    if (workspaceSlug !== 'rina') return null;

    const program = MockStateStore.getState().programs.find(
      p => p.workspaceSlug === workspaceSlug && p.programSlug === programSlug
    );

    if (!program) return null;
    if (program.status !== 'published') return null;
    if (program.accessType === 'private' || program.programType === 'private') return null;

    const presentation = this.getPresentation(program.id, program);

    const isRegistrationAllowed =
      program.programType === 'lead_magnet' &&
      program.accessType === 'public' &&
      program.pricing === 'free';

    let registrationStatusNotice: string | undefined;
    if (program.programType === 'aftersales') {
      registrationStatusNotice = 'Program ini khusus untuk peserta yang telah menyelesaikan tes STIFIn.';
    } else if (program.programType === 'paid' || program.pricing === 'one_time') {
      registrationStatusNotice = 'Program Berbayar — Hubungi Promotor / Tersedia via Konsultasi.';
    }

    const promoter = (await this.getPublicWorkspaceProfile(workspaceSlug)) || MOCK_RINA_PROFILE;

    const previewModules = program.modules.map(mod => ({
      id: mod.id,
      title: mod.title,
      order: mod.order,
      lessons: (mod.lessons || []).map(les => ({
        id: les.id,
        title: les.title,
        order: les.order,
        hasVideo: !!(les.videoYoutubeUrl || les.videoExternalId),
        hasReflection: !!les.hasReflection,
      })),
    }));

    const totalLessonsCount = program.modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

    return {
      program: {
        id: program.id,
        workspaceSlug: program.workspaceSlug,
        programSlug: program.programSlug,
        title: program.title,
        subtitle: program.subtitle,
        description: program.description,
        programType: program.programType,
        accessType: program.accessType,
        pricing: program.pricing,
        priceAmount: program.priceAmount,
        publishedAt: program.publishedAt,
        totalModulesCount: program.modules.length,
        totalLessonsCount,
        modules: previewModules,
      },
      presentation,
      promoter,
      isRegistrationAllowed,
      registrationStatusNotice,
    };
  }

  async updatePublicWorkspaceProfile(
    workspaceSlug: string,
    profile: Partial<PublicWorkspaceProfile>
  ): Promise<PublicWorkspaceProfile> {
    let updatedProfile: PublicWorkspaceProfile;
    MockStateStore.updateState(curr => {
      const existing = (curr.workspaceProfiles && curr.workspaceProfiles[workspaceSlug]) || MOCK_RINA_PROFILE;
      updatedProfile = {
        ...existing,
        ...profile,
        stats: {
          ...existing.stats,
          ...(profile.stats || {}),
        },
      };
      return {
        ...curr,
        workspaceProfiles: {
          ...curr.workspaceProfiles,
          [workspaceSlug]: updatedProfile,
        },
      };
    });
    return updatedProfile!;
  }

  async getStorefrontProfile(): Promise<PublicWorkspaceProfile | null> {
    const storeProfiles = MockStateStore.getState().workspaceProfiles;
    if (storeProfiles) {
      const firstSlug = Object.keys(storeProfiles)[0];
      if (firstSlug && storeProfiles[firstSlug]) return storeProfiles[firstSlug];
    }
    return MOCK_RINA_PROFILE;
  }

  async updateStorefrontProfile(profile: Partial<PublicWorkspaceProfile>): Promise<PublicWorkspaceProfile> {
    const current = await this.getStorefrontProfile();
    const slug = current?.workspaceSlug || 'rina';
    return this.updatePublicWorkspaceProfile(slug, profile);
  }

  async getStorefrontTheme(): Promise<StorefrontTheme> {
    const profile = await this.getStorefrontProfile();
    const theme = (profile?.theme as any) || TALIRA_DEFAULT_STOREFRONT_THEME;
    return {
      organizationId: 'mock-org-id',
      brandName: profile?.displayName || 'Talira Class',
      tagline: profile?.tagline || null,
      logoUrl: profile?.logoUrl || null,
      ...theme,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async updateStorefrontTheme(theme: UpdateStorefrontThemeRequest): Promise<StorefrontTheme> {
    const current = await this.getStorefrontProfile();
    const slug = current?.workspaceSlug || 'rina';
    await this.updatePublicWorkspaceProfile(slug, {
      displayName: theme.brandName,
      tagline: theme.tagline,
      logoUrl: theme.logoUrl,
      theme,
    });
    return {
      organizationId: 'mock-org-id',
      ...theme,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async resetStorefrontTheme(): Promise<StorefrontTheme> {
    const current = await this.getStorefrontProfile();
    return this.updateStorefrontTheme({
      ...TALIRA_DEFAULT_STOREFRONT_THEME,
      brandName: current?.displayName || 'Talira Class',
      tagline: current?.tagline || null,
      logoUrl: current?.logoUrl || null,
    });
  }

  async presignWorkspaceAsset(
    kind: 'avatar' | 'logo',
    params: { fileName: string; contentType: string; contentLength: number }
  ) {
    const key = `workspace/mock-org/${kind}/${Date.now()}-${params.fileName}`;
    return {
      key,
      uploadUrl: `https://mock.r2.dev/upload/${key}`,
      publicUrl: `/images/${params.fileName}`,
      contentType: params.contentType,
      contentLength: params.contentLength,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      maxBytes: 2097152,
    };
  }
}

export const publicStorefrontRepository = new MockPublicStorefrontRepository();
