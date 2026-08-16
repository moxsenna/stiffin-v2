import { Program, Lesson } from '@promotor/contracts';
import { ProgramRepositoryPort, CreateProgramDetailedInput } from '@/modules/programs/ports';
import { PromotorClassContentApiClient } from '@promotor/api-client';

export class HttpProgramRepository implements ProgramRepositoryPort {
  private client: PromotorClassContentApiClient;

  constructor(client: PromotorClassContentApiClient) {
    this.client = client;
  }

  async getPrograms(): Promise<Program[]> {
    return this.client.getPrograms();
  }

  async getProgramById(id: string): Promise<Program | undefined> {
    return this.client.getProgramById(id);
  }

  async getProgramBySlugs(workspaceSlug: string, programSlug: string): Promise<Program | undefined> {
    const list = await this.client.getPrograms();
    return list.find(p => p.workspaceSlug === workspaceSlug && p.programSlug === programSlug);
  }

  async createProgram(
    title: string,
    subtitle: string,
    description: string,
    priceType: 'free' | 'paid'
  ): Promise<Program> {
    return this.client.createProgram({
      title,
      subtitle: subtitle || undefined,
      description: description || undefined,
      programType: priceType === 'paid' ? 'paid' : 'lead_magnet',
      priceAmount: priceType === 'paid' ? 99000 : 0,
    });
  }

  async createProgramDetailed(input: CreateProgramDetailedInput): Promise<Program> {
    return this.client.createProgram({
      title: input.title,
      subtitle: input.subtitle,
      description: input.description,
      programType: input.programType,
      priceAmount: input.priceAmount,
      heroEyebrow: input.heroEyebrow,
      durationLabel: input.durationLabel,
      coverVariant: input.coverVariant as any,
      imageUrl: input.imageUrl,
      outcomes: input.outcomes,
    });
  }

  async toggleProgramStatus(programId: string): Promise<Program> {
    const prog = await this.client.getProgramById(programId);
    if (!prog) throw new Error('Program not found');
    if (prog.status === 'published') {
      return this.client.unpublishProgram(programId);
    } else {
      return this.client.publishProgram(programId);
    }
  }

  async deleteProgram(programId: string): Promise<void> {
    return this.client.deleteProgram(programId);
  }

  async addModule(programId: string, title: string): Promise<Program> {
    return this.client.addModule(programId, title);
  }

  async deleteModule(programId: string, moduleId: string): Promise<Program> {
    return this.client.deleteModule(programId, moduleId);
  }

  async addLesson(programId: string, moduleId: string, lessonTitle: string, videoUrl?: string): Promise<Program> {
    return this.client.addLesson(programId, moduleId, lessonTitle, videoUrl);
  }

  async deleteLesson(programId: string, moduleId: string, lessonId: string): Promise<Program> {
    return this.client.deleteLesson(programId, moduleId, lessonId);
  }

  async reorderModules(programId: string, moduleIdsOrder: string[]): Promise<Program> {
    return this.client.reorderModules(programId, moduleIdsOrder);
  }

  async saveLesson(programId: string, moduleId: string, lesson: Lesson): Promise<Program> {
    return this.client.saveLesson(programId, moduleId, lesson.id, {
      title: lesson.title,
      order: lesson.order,
      textContent: lesson.textContent,
      videoProvider: lesson.videoProvider,
      videoUrl: lesson.videoYoutubeUrl,
      videoExternalId: lesson.videoExternalId,
      reflectionType: lesson.reflectionType,
      reflectionPrompt: lesson.reflectionPrompt,
      reflectionOptions: lesson.reflectionOptions,
      ctaType: lesson.ctaType,
      ctaLabel: lesson.ctaLabel,
      ctaTargetProgramId: lesson.ctaTargetProgramId,
      ctaConfig: lesson.ctaConfig,
      attachments: lesson.attachments?.map((a) => ({
        id: a.id,
        name: a.name,
        url: a.url,
        sizeFormatted: a.sizeFormatted,
        kind: (a.kind as any) ?? 'download',
        order: a.order,
      })),
    });
  }
}
