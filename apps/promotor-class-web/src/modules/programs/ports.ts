import { Program, Module, Lesson } from '@promotor/contracts';

export interface ProgramRepositoryPort {
  getPrograms(): Promise<Program[]>;
  getProgramById(id: string): Promise<Program | undefined>;
  getProgramBySlugs(workspaceSlug: string, programSlug: string): Promise<Program | undefined>;
  createProgram(title: string, subtitle: string, description: string, priceType: 'free' | 'paid'): Promise<Program>;
  reorderModules(programId: string, moduleIdsOrder: string[]): Promise<Program>;
  saveLesson(programId: string, moduleId: string, lesson: Lesson): Promise<Program>;
}
