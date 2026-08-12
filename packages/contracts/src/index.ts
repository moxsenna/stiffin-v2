import { z } from 'zod';

// ==========================================
// 1. Phone E.164 Zod Schema & Type
// ==========================================
export const PhoneE164Schema = z.string().regex(/^\+[1-9]\d{1,14}$/, 'Format nomor HP harus E.164 valid (contoh: +6281234567890)');
export type PhoneE164 = z.infer<typeof PhoneE164Schema>;

// ==========================================
// 2. Product Entitlements & Integration Health
// ==========================================
export const ProductEntitlementsSchema = z.object({
  promotorClass: z.boolean(),
  promotorFlow: z.boolean(),
});
export type ProductEntitlements = z.infer<typeof ProductEntitlementsSchema>;

export const IntegrationHealthSchema = z.object({
  promotorFlow: z.enum(['AVAILABLE', 'UNAVAILABLE']),
});
export type IntegrationHealth = z.infer<typeof IntegrationHealthSchema>;

// ==========================================
// 3. Contact DTO & Zod Schema
// ==========================================
export const ContactSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1, 'Nama wajib diisi'),
  phoneE164: PhoneE164Schema,
  createdAt: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

// ==========================================
// 4. Canonical Learning Events & Envelopes
// ==========================================
export const LearningEventTypeSchema = z.enum([
  'program.created',
  'program.published',
  'learner.registered',
  'learner.enrolled',
  'lesson.started',
  'lesson.completed',
  'reflection.submitted',
  'program.progress_50',
  'program.progress_80',
  'program.completed',
  'cta.viewed',
  'cta.clicked',
  'learner.inactive',
]);
export type LearningEventType = z.infer<typeof LearningEventTypeSchema>;

/**
 * Canonical Class-owned domain history item
 */
export const LearningEventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  contactId: z.string(),
  eventType: LearningEventTypeSchema,
  programId: z.string().optional(),
  enrollmentId: z.string().optional(),
  lessonId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  occurredAt: z.string(),
});
export type LearningEvent = z.infer<typeof LearningEventSchema>;

/**
 * Cross-product transport envelope contract
 */
export const IntegrationEventEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  eventId: z.string(),
  eventType: LearningEventTypeSchema,
  sourceApp: z.literal('promotor-class'),
  organizationId: z.string(),
  contactId: z.string(),
  occurredAt: z.string(),
  subject: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});
export type IntegrationEventEnvelope<TPayload = Record<string, unknown>> = Omit<
  z.infer<typeof IntegrationEventEnvelopeSchema>,
  'payload'
> & { payload: TPayload };

// ==========================================
// 5. Program, Module, Lesson & Reflection DTOs
// ==========================================
export type ProgramType = 'lead_magnet' | 'aftersales' | 'paid' | 'private' | 'challenge';
export type AccessType = 'public' | 'private' | 'manual';
export type ProgramStatus = 'draft' | 'published' | 'archived';
export type PricingType = 'free' | 'one_time';
export type ReflectionType = 'long_text' | 'single_select' | 'multi_select';

export interface LessonAttachment {
  id: string;
  name: string;
  url: string;
  sizeFormatted?: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  order: number;
  videoYoutubeUrl?: string;
  videoExternalId?: string;
  textContent?: string;
  attachments?: LessonAttachment[];
  hasReflection: boolean;
  reflectionType?: ReflectionType;
  reflectionPrompt?: string;
  reflectionOptions?: string[];
  hasCta: boolean;
  ctaLabel?: string;
  ctaUrl?: string;
}

export interface Module {
  id: string;
  programId: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Program {
  id: string;
  organizationId: string;
  workspaceSlug: string;
  programSlug: string;
  title: string;
  subtitle?: string;
  description: string;
  programType: ProgramType;
  accessType: AccessType;
  status: ProgramStatus;
  pricing: PricingType;
  priceAmount?: number;
  modules: Module[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 6. Reflection Submission Record
// ==========================================
export interface Reflection {
  id: string;
  organizationId: string;
  enrollmentId: string;
  lessonId: string;
  contactId: string;
  reflectionType: ReflectionType;
  answerText?: string;
  selectedOptions?: string[];
  submittedAt: string;
}

// ==========================================
// 7. Enrollment & LessonProgress DTOs
// ==========================================
export type EnrollmentStatus = 'aktif' | 'selesai';

export interface LessonProgress {
  completed: boolean;
  completedAt?: string;
  reflectionAnswer?: string;
  selectedOptions?: string[];
}

export interface Enrollment {
  id: string;
  organizationId: string;
  contactId: string;
  programId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string;
  progressPercent: number;
  completedLessonIds: string[];
  lessonProgress: Record<string, LessonProgress>;
}

// ==========================================
// 8. LearningSignal DTO
// ==========================================
export type SignalStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED';

export interface LearningSignal {
  id: string;
  organizationId: string;
  contactId: string;
  enrollmentId: string;
  signalLevel: 'Minat tinggi' | 'Minat sedang' | 'Minat rendah';
  intentScore: number; // 0 - 100
  primaryReason: string;
  rawReflectionQuote?: string;
  status: SignalStatus;
  evaluatedAt: string;
}

// ==========================================
// 9. Integration Outbox & Flow Reference
// ==========================================
export interface IntegrationOutboxItem {
  id: string;
  envelope: IntegrationEventEnvelope;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  createdAt: string;
  sentAt?: string;
}

export interface FlowNextActionRef {
  id: string;
  contactId: string;
  nextActionId: string;
  title: string;
  createdAt: string;
}
