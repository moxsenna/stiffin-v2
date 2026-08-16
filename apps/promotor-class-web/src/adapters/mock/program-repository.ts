import { Program, Module, Lesson } from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';
import { ProgramRepositoryPort, CreateProgramDetailedInput } from '@/modules/programs/ports';
import { extractYoutubeId } from '@/lib/video/parse-youtube-url';

export class MockProgramRepository implements ProgramRepositoryPort {
  async getPrograms(): Promise<Program[]> {
    return MockStateStore.getState().programs;
  }

  async getProgramById(id: string): Promise<Program | undefined> {
    return MockStateStore.getState().programs.find(p => p.id === id);
  }

  async getProgramBySlugs(workspaceSlug: string, programSlug: string): Promise<Program | undefined> {
    return MockStateStore.getState().programs.find(
      p => p.workspaceSlug === workspaceSlug && p.programSlug === programSlug
    );
  }

  async createProgram(
    title: string,
    subtitle: string,
    description: string,
    priceType: 'free' | 'paid'
  ): Promise<Program> {
    const state = MockStateStore.getState();
    const newProgramId = `prog_${Date.now()}`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const newModule: Module = {
      id: `mod_${Date.now()}`,
      programId: newProgramId,
      title: 'Modul 1: Pengenalan Materi',
      order: 1,
      lessons: [
        {
          id: `les_${Date.now()}_1`,
          moduleId: `mod_${Date.now()}`,
          title: 'Sesi 1: Pengantar Program',
          order: 1,
          textContent: 'Selamat datang di program ini. Silakan ikuti materi dengan tekun.',
          hasReflection: true,
          reflectionType: 'long_text',
          reflectionPrompt: 'Tuliskan harapan utama Anda dalam mengikuti program ini:',
          hasCta: false,
        },
      ],
    };

    const newProgram: Program = {
      id: newProgramId,
      organizationId: state.organization.id,
      workspaceSlug: state.organization.slug,
      programSlug: slug,
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      programType: priceType === 'free' ? 'lead_magnet' : 'paid',
      accessType: 'public',
      status: 'draft', // F0.4 Requirement: Programs default to draft
      pricing: priceType === 'free' ? 'free' : 'one_time',
      priceAmount: priceType === 'paid' ? 150000 : 0,
      modules: [newModule],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MockStateStore.updateState(curr => ({
      ...curr,
      programs: [newProgram, ...curr.programs],
    }));

    return newProgram;
  }

  async createProgramDetailed(input: CreateProgramDetailedInput): Promise<Program> {
    const state = MockStateStore.getState();
    const newProgramId = `prog_${Date.now()}`;
    const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const initialModule: Module = {
      id: `mod_${Date.now()}_1`,
      programId: newProgramId,
      title: 'Modul 1: Pengenalan & Pengantar Program',
      order: 1,
      lessons: [
        {
          id: `les_${Date.now()}_1`,
          moduleId: `mod_${Date.now()}_1`,
          title: 'Sesi 1: Selamat Datang & Sambutan',
          order: 1,
          textContent: 'Selamat datang di program ini. Silakan simak materi dengan tekun.',
          hasReflection: true,
          reflectionType: 'long_text',
          reflectionPrompt: 'Tuliskan harapan & target utama Anda setelah mengikuti program ini:',
          hasCta: false,
        },
      ],
    };

    const newProgram: Program = {
      id: newProgramId,
      organizationId: state.organization.id,
      workspaceSlug: state.organization.slug,
      programSlug: slug,
      title: input.title.trim(),
      subtitle: (input.subtitle || '').trim(),
      description: input.description.trim(),
      programType: input.programType,
      accessType: 'public',
      status: 'draft', // F0.4 Requirement: Programs default to draft
      pricing: input.programType === 'lead_magnet' ? 'free' : 'one_time',
      priceAmount: input.programType === 'lead_magnet' ? 0 : (input.priceAmount || 150000),
      modules: [initialModule],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const presentation = {
      coverVariant: (input.coverVariant || 'cover-a') as 'cover-a' | 'cover-b' | 'cover-c',
      imageUrl: input.imageUrl,
      featured: false,
      heroEyebrow: input.heroEyebrow || (input.programType === 'lead_magnet' ? 'Program Gratis' : input.programType === 'aftersales' ? 'Khusus Peserta Tes' : 'Program Berbayar'),
      shortOutcome: input.subtitle || input.description || '',
      durationLabel: input.durationLabel || 'Mandiri',
      learningOutcomes: input.outcomes && input.outcomes.length > 0 ? input.outcomes : [
        { title: 'Memahami Konsep Dasar', description: 'Mendapat gambaran utuh materi yang dipelajari.' },
        { title: 'Aplikasi Praktis', description: 'Mencoba penyesuaian kecil di rumah atau kegiatan harian.' },
      ],
    };

    // Update state including persisted presentation
    MockStateStore.updateState(curr => ({
      ...curr,
      programs: [newProgram, ...curr.programs],
      programPresentations: {
        ...curr.programPresentations,
        [newProgramId]: presentation,
      },
    }));

    return newProgram;
  }

  async addModule(programId: string, title: string): Promise<Program> {
    MockStateStore.updateState(curr => {
      const programs = curr.programs.map(p => {
        if (p.id !== programId) return p;
        const newModId = `mod_${Date.now()}`;
        const newMod: Module = {
          id: newModId,
          programId,
          title: title.trim(),
          order: p.modules.length + 1,
          lessons: [],
        };
        return { ...p, modules: [...p.modules, newMod], updatedAt: new Date().toISOString() };
      });
      return { ...curr, programs };
    });

    const updated = await this.getProgramById(programId);
    if (!updated) throw new Error('Program not found after adding module');
    return updated;
  }

  async addLesson(
    programId: string,
    moduleId: string,
    lessonTitle: string,
    videoUrl?: string
  ): Promise<Program> {
    MockStateStore.updateState(curr => {
      const programs = curr.programs.map(p => {
        if (p.id !== programId) return p;
        const modules = p.modules.map(m => {
          if (m.id !== moduleId) return m;
          const newLesId = `les_${Date.now()}`;
          const videoExternalId = extractYoutubeId(videoUrl) || undefined;
          const newLes: Lesson = {
            id: newLesId,
            moduleId,
            title: lessonTitle.trim(),
            order: m.lessons.length + 1,
            textContent: 'Silakan pelajari materi berikut.',
            videoYoutubeUrl: videoUrl,
            videoExternalId,
            hasReflection: false,
            hasCta: false,
          };
          return { ...m, lessons: [...m.lessons, newLes] };
        });
        return { ...p, modules, updatedAt: new Date().toISOString() };
      });
      return { ...curr, programs };
    });

    const updated = await this.getProgramById(programId);
    if (!updated) throw new Error('Program not found after adding lesson');
    return updated;
  }

  async deleteModule(programId: string, moduleId: string): Promise<Program> {
    MockStateStore.updateState(curr => {
      const programs = curr.programs.map(p => {
        if (p.id !== programId) return p;
        const modules = p.modules.filter(m => m.id !== moduleId);
        return { ...p, modules, updatedAt: new Date().toISOString() };
      });
      return { ...curr, programs };
    });

    const updated = await this.getProgramById(programId);
    if (!updated) throw new Error('Program not found after deleting module');
    return updated;
  }

  async deleteLesson(programId: string, moduleId: string, lessonId: string): Promise<Program> {
    MockStateStore.updateState(curr => {
      const programs = curr.programs.map(p => {
        if (p.id !== programId) return p;
        const modules = p.modules.map(m => {
          if (m.id !== moduleId) return m;
          const lessons = m.lessons.filter(l => l.id !== lessonId);
          return { ...m, lessons };
        });
        return { ...p, modules, updatedAt: new Date().toISOString() };
      });
      return { ...curr, programs };
    });

    const updated = await this.getProgramById(programId);
    if (!updated) throw new Error('Program not found after deleting lesson');
    return updated;
  }

  async toggleProgramStatus(programId: string): Promise<Program> {
    MockStateStore.updateState(curr => {
      const programs = curr.programs.map(p => {
        if (p.id !== programId) return p;
        const newStatus = p.status === 'published' ? 'draft' : 'published';
        return { ...p, status: newStatus as 'published' | 'draft', updatedAt: new Date().toISOString() };
      });
      return { ...curr, programs };
    });

    const updated = await this.getProgramById(programId);
    if (!updated) throw new Error('Program not found after toggling status');
    return updated;
  }

  async reorderModules(programId: string, moduleIdsOrder: string[]): Promise<Program> {
    MockStateStore.updateState(curr => {
      const programs = curr.programs.map(p => {
        if (p.id !== programId) return p;
        const moduleMap = new Map(p.modules.map(m => [m.id, m]));
        const reorderedModules: Module[] = [];
        moduleIdsOrder.forEach((id, idx) => {
          const mod = moduleMap.get(id);
          if (mod) {
            reorderedModules.push({ ...mod, order: idx + 1 });
          }
        });
        return { ...p, modules: reorderedModules, updatedAt: new Date().toISOString() };
      });
      return { ...curr, programs };
    });

    const updated = await this.getProgramById(programId);
    if (!updated) throw new Error('Program not found after reorder');
    return updated;
  }

  async saveLesson(programId: string, moduleId: string, updatedLesson: Lesson): Promise<Program> {
    MockStateStore.updateState(curr => {
      const programs = curr.programs.map(p => {
        if (p.id !== programId) return p;
        const modules = p.modules.map(m => {
          if (m.id !== moduleId) return m;
          const lessons = m.lessons.map(les => {
            if (les.id !== updatedLesson.id) return les;

            const videoExternalId = extractYoutubeId(updatedLesson.videoYoutubeUrl ?? undefined) || les.videoExternalId;

            return {
              ...les,
              ...updatedLesson,
              order: les.order,
              attachments: les.attachments,
              videoExternalId,
            };
          });
          return { ...m, lessons };
        });
        return { ...p, modules, updatedAt: new Date().toISOString() };
      });
      return { ...curr, programs };
    });

    const updated = await this.getProgramById(programId);
    if (!updated) throw new Error('Program not found after lesson update');
    return updated;
  }
}

export const programRepository = new MockProgramRepository();
