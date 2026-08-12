import { Program, Module, Lesson } from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';
import { ProgramRepositoryPort } from '@/modules/programs/ports';
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
      programId: newProgramId, // Fixed Bug #12: Match parent programId
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
      status: 'published',
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

            // Fixed Bug #13: Preserve original order & attachments metadata
            const videoExternalId = extractYoutubeId(updatedLesson.videoYoutubeUrl) || les.videoExternalId;

            return {
              ...les,
              ...updatedLesson,
              order: les.order, // Preserve original lesson order!
              attachments: les.attachments, // Preserve attachments metadata!
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
