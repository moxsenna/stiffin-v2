import { Program, Module, Lesson } from '@promotor/contracts';
import { MockStateStore } from './mock-state-store';

export class MockProgramRepository {
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

  async createProgram(programData: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>): Promise<Program> {
    const newId = `prog_${Date.now()}`;
    const now = new Date().toISOString();
    const newProgram: Program = {
      ...programData,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };

    MockStateStore.updateState(state => ({
      ...state,
      programs: [newProgram, ...state.programs],
    }));

    return newProgram;
  }

  async reorderModules(programId: string, moduleIdsOrder: string[]): Promise<Program> {
    const program = await this.getProgramById(programId);
    if (!program) throw new Error('Program not found');

    const moduleMap = new Map(program.modules.map(m => [m.id, m]));
    const reordered: Module[] = moduleIdsOrder
      .map((id, idx) => {
        const mod = moduleMap.get(id);
        if (!mod) return null;
        return { ...mod, order: idx + 1 };
      })
      .filter((m): m is Module => m !== null);

    const updatedProgram = { ...program, modules: reordered, updatedAt: new Date().toISOString() };

    MockStateStore.updateState(state => ({
      ...state,
      programs: state.programs.map(p => (p.id === programId ? updatedProgram : p)),
    }));

    return updatedProgram;
  }

  async saveLesson(programId: string, moduleId: string, lessonData: Lesson): Promise<Program> {
    const program = await this.getProgramById(programId);
    if (!program) throw new Error('Program not found');

    const updatedModules = program.modules.map(mod => {
      if (mod.id !== moduleId) return mod;
      const existingIdx = mod.lessons.findIndex(l => l.id === lessonData.id);
      let updatedLessons: Lesson[];
      if (existingIdx >= 0) {
        updatedLessons = mod.lessons.map(l => (l.id === lessonData.id ? lessonData : l));
      } else {
        updatedLessons = [...mod.lessons, lessonData];
      }
      return { ...mod, lessons: updatedLessons };
    });

    const updatedProgram = { ...program, modules: updatedModules, updatedAt: new Date().toISOString() };

    MockStateStore.updateState(state => ({
      ...state,
      programs: state.programs.map(p => (p.id === programId ? updatedProgram : p)),
    }));

    return updatedProgram;
  }

  async setPublishStatus(programId: string, isPublished: boolean): Promise<Program> {
    const program = await this.getProgramById(programId);
    if (!program) throw new Error('Program not found');

    const updatedProgram = { ...program, isPublished, updatedAt: new Date().toISOString() };

    MockStateStore.updateState(state => ({
      ...state,
      programs: state.programs.map(p => (p.id === programId ? updatedProgram : p)),
    }));

    return updatedProgram;
  }
}

export const programRepository = new MockProgramRepository();
