import { Program, Lesson } from '@promotor/contracts';

export interface CreateProgramDetailedInput {
  title: string;
  subtitle?: string;
  description: string;
  programType: 'lead_magnet' | 'aftersales' | 'paid' | 'private';
  priceAmount?: number;
  bankTransferEnabled?: boolean;
  whatsAppEnabled?: boolean;
  heroEyebrow?: string;
  durationLabel?: string;
  coverVariant?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  coverImageKey?: string;
  outcomes?: Array<{ title: string; description: string }>;
}

export interface PresignCoverResult {
  key: string;
  uploadUrl: string;
  publicUrl: string;
  contentType: string;
  contentLength: number;
  expiresAt: string;
  maxBytes: number;
}

export interface ConfirmCoverResult {
  key: string;
  publicUrl: string;
  contentType: string;
  contentLength: number;
}

export interface ProgramRepositoryPort {
  getPrograms(): Promise<Program[]>;
  getProgramById(id: string): Promise<Program | undefined>;
  getProgramBySlugs(workspaceSlug: string, programSlug: string): Promise<Program | undefined>;
  createProgram(title: string, subtitle: string, description: string, priceType: 'free' | 'paid'): Promise<Program>;
  createProgramDetailed(input: CreateProgramDetailedInput): Promise<Program>;
  deleteProgram(programId: string): Promise<void>;
  toggleProgramStatus(programId: string): Promise<Program>;
  addModule(programId: string, title: string): Promise<Program>;
  deleteModule(programId: string, moduleId: string): Promise<Program>;
  addLesson(programId: string, moduleId: string, lessonTitle: string, videoUrl?: string): Promise<Program>;
  deleteLesson(programId: string, moduleId: string, lessonId: string): Promise<Program>;
  reorderModules(programId: string, moduleIdsOrder: string[]): Promise<Program>;
  saveLesson(programId: string, moduleId: string, lesson: Lesson): Promise<Program>;
  presignCoverUpload(params: { programId?: string; fileName: string; contentType: string; contentLength: number }): Promise<PresignCoverResult>;
  confirmCoverUpload(params: { programId: string; key: string; contentType: string; contentLength?: number }): Promise<ConfirmCoverResult>;
  deleteCoverImage(programId: string): Promise<void>;
}
