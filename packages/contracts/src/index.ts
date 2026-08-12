// Shared Core Identity Types
export type OrganizationId = string;
export type UserId = string;
export type ContactId = string;

export interface Organization {
  id: OrganizationId;
  name: string;
  slug: string;
  createdAt: string;
}

export interface User {
  id: UserId;
  name: string;
  email: string;
  phone: string; // E.164 format (+628...)
  organizationId: OrganizationId;
}

export interface Contact {
  id: ContactId;
  organizationId: OrganizationId;
  name: string;
  phone: string; // E.164 format (+628...)
  email?: string;
  notes?: string;
  createdAt: string;
}

// Integration Entitlements & Health Statuses
export type IntegrationMode = 'CLASS_ONLY' | 'BUNDLE_AVAILABLE' | 'BUNDLE_FLOW_UNAVAILABLE';

export interface ProductEntitlements {
  hasPromotorClass: boolean;
  hasPromotorFlow: boolean;
  integrationMode: IntegrationMode;
}

export interface IntegrationHealth {
  status: 'healthy' | 'degraded' | 'offline';
  lastSyncedAt?: string;
  pendingOutboxCount: number;
}

// PromotorClass Domain Models
export type ProgramId = string;
export type ModuleId = string;
export type LessonId = string;
export type EnrollmentId = string;

export interface ResourceAttachment {
  id: string;
  name: string;
  url: string;
  sizeFormatted?: string;
  fileType: 'pdf' | 'image' | 'doc';
}

export interface Lesson {
  id: LessonId;
  moduleId: ModuleId;
  title: string;
  order: number;
  videoYoutubeUrl?: string;
  textContent?: string;
  attachments?: ResourceAttachment[];
  hasReflection: boolean;
  reflectionPrompt?: string;
  hasCta: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface Module {
  id: ModuleId;
  programId: ProgramId;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Program {
  id: ProgramId;
  organizationId: OrganizationId;
  title: string;
  subtitle?: string;
  description?: string;
  category: string;
  isPublished: boolean;
  priceType: 'free' | 'paid';
  priceAmount?: number;
  workspaceSlug: string;
  programSlug: string;
  modules: Module[];
  createdAt: string;
  updatedAt: string;
}

export interface Reflection {
  id: string;
  enrollmentId: EnrollmentId;
  lessonId: LessonId;
  answerText: string;
  createdAt: string;
}

export interface LessonProgress {
  lessonId: LessonId;
  completed: boolean;
  completedAt?: string;
  reflectionAnswer?: string;
}

export type LearnerStatus = 'aktif' | 'selesai' | 'belum_mulai';

export interface Enrollment {
  id: EnrollmentId;
  contactId: ContactId;
  programId: ProgramId;
  status: LearnerStatus;
  progressPercent: number;
  startedAt: string;
  completedAt?: string;
  lastActiveAt: string;
  lessonProgress: Record<LessonId, LessonProgress>;
}

// Intent Signals & Learning Signals
export type MinatStatus = 'Minat tinggi' | 'Minat sedang' | 'Minat rendah';

export interface LearningSignal {
  id: string;
  contactId: ContactId;
  enrollmentId: EnrollmentId;
  programId: ProgramId;
  minatStatus: MinatStatus;
  primaryReason: string; // e.g. "Program selesai", "CTA diklik", "Belum tes"
  rawQuoteSnippet?: string;
  intentScoreNumeric?: number; // Debug/analytics secondary score
  createdAt: string;
}

export interface RecommendedNextStep {
  id: string;
  contactId: ContactId;
  enrollmentId: EnrollmentId;
  suggestedAction: string; // e.g. "Follow-up via WhatsApp untuk tawaran tes STIFIn"
  reason: string;
  createdAt: string;
}

export interface FlowNextActionRef {
  id: string;
  flowNextActionId: string;
  contactId: ContactId;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

// Integration Events & Projections
export interface LearningEvent {
  id: string;
  eventType: 'LESSON_COMPLETED' | 'REFLECTION_SUBMITTED' | 'PROGRAM_COMPLETED' | 'ENROLLMENT_CREATED';
  contactId: ContactId;
  enrollmentId: EnrollmentId;
  programId: ProgramId;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface IntegrationEventEnvelope {
  id: string;
  eventId: string;
  sourceApp: 'promotor-class';
  targetApp: 'promotor-flow';
  payload: LearningEvent;
  status: 'queued' | 'dispatched' | 'failed';
  attempts: number;
  createdAt: string;
}

export interface LearningActivityProjection {
  id: string;
  contactId: ContactId;
  learnerName: string;
  activitySummary: string;
  timeAgoFormatted: string;
  timestamp: string;
}
