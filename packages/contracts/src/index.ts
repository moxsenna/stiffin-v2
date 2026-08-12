import { z } from 'zod';

// ==========================================
// 1. Phone E.164 Strict Validation
// ==========================================
export const PhoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Must be a valid E.164 phone string starting with + and country code');

export type PhoneE164 = z.infer<typeof PhoneE164Schema>;

// ==========================================
// 2. Organization & Contact Contracts
// ==========================================
export const ContactSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string().min(1, 'Name cannot be empty'),
  phoneE164: PhoneE164Schema,
  createdAt: z.string(),
});

export type Contact = z.infer<typeof ContactSchema>;

// ==========================================
// 3. Learning Domain Models (PromotorClass)
// ==========================================
export type ProgramType = 'lead_magnet' | 'aftersales' | 'paid' | 'private' | 'challenge';
export type AccessType = 'public' | 'private' | 'manual';
export type ProgramStatus = 'draft' | 'published' | 'archived';
export type ProgramPricing = 'free' | 'one_time';
export type ReflectionType = 'long_text' | 'single_select' | 'multi_select';

export const LessonAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  sizeFormatted: z.string().optional(),
});

export type LessonAttachment = z.infer<typeof LessonAttachmentSchema>;

export const LessonSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string(),
  order: z.number(),
  textContent: z.string().optional(),
  videoYoutubeUrl: z.string().optional(),
  videoExternalId: z.string().optional(),
  attachments: z.array(LessonAttachmentSchema).optional(),
  hasReflection: z.boolean().optional(),
  reflectionType: z.enum(['long_text', 'single_select', 'multi_select']).optional(),
  reflectionPrompt: z.string().optional(),
  hasCta: z.boolean().optional(),
  ctaLabel: z.string().optional(),
  ctaUrl: z.string().optional(),
});

export type Lesson = z.infer<typeof LessonSchema>;

export const ModuleSchema = z.object({
  id: z.string(),
  programId: z.string(),
  title: z.string(),
  order: z.number(),
  lessons: z.array(LessonSchema),
});

export type Module = z.infer<typeof ModuleSchema>;

export const ProgramSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  workspaceSlug: z.string(),
  programSlug: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  programType: z.enum(['lead_magnet', 'aftersales', 'paid', 'private', 'challenge']),
  accessType: z.enum(['public', 'private', 'manual']),
  status: z.enum(['draft', 'published', 'archived']),
  pricing: z.enum(['free', 'one_time']),
  priceAmount: z.number().optional(),
  modules: z.array(ModuleSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Program = z.infer<typeof ProgramSchema>;

export const EnrollmentSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  contactId: z.string(),
  programId: z.string(),
  status: z.enum(['aktif', 'selesai', 'dibatalkan']),
  enrolledAt: z.string(),
  completedAt: z.string().optional(),
  progressPercent: z.number().min(0).max(100),
  completedLessonIds: z.array(z.string()),
  lessonProgress: z.record(
    z.string(),
    z.object({
      completed: z.boolean(),
      completedAt: z.string(),
      reflectionAnswer: z.string().optional(),
    })
  ),
});

export type Enrollment = z.infer<typeof EnrollmentSchema>;

export const ReflectionSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  enrollmentId: z.string(),
  lessonId: z.string(),
  contactId: z.string(),
  reflectionType: z.enum(['long_text', 'single_select', 'multi_select']),
  answerText: z.string(),
  submittedAt: z.string(),
});

export type Reflection = z.infer<typeof ReflectionSchema>;

// ==========================================
// 4. Canonical Learning Events & Activity Projection
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

export const LearningActivityProjectionSchema = z.object({
  organizationId: z.string(),
  contactId: z.string(),
  source: z.literal('PROMOTORCLASS'),
  sourceEventId: z.string(),
  eventType: z.enum([
    'PROGRAM_COMPLETED',
    'CTA_CLICKED',
    'LEARNER_INACTIVE',
    'LEARNING_SIGNAL',
  ]),
  summary: z.string(),
  context: z.record(z.string(), z.unknown()),
  idempotencyKey: z.string(),
});

export type LearningActivityProjection = z.infer<typeof LearningActivityProjectionSchema>;

export type SignalStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED';

export const LearningSignalSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  contactId: z.string(),
  programId: z.string().optional(),
  enrollmentId: z.string().optional(),
  sourceEventId: z.string().optional(),
  signalLevel: z.enum(['Minat tinggi', 'Minat sedang', 'Minat rendah']),
  intentScore: z.number().min(0).max(100),
  primaryReason: z.string(),
  rawReflectionQuote: z.string().optional(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'DISMISSED']),
  evaluatedAt: z.string(),
});

export type LearningSignal = z.infer<typeof LearningSignalSchema>;

// ==========================================
// 5. Integration Event Envelope (Exact INTEGRATION_CONTRACT.md)
// ==========================================
export const IntegrationEventEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  eventId: z.string(),
  eventType: z.string(),
  sourceApp: z.enum(['PROMOTORCLASS', 'PROMOTORFLOW']),
  organizationId: z.string(),
  contactId: z.string(),
  occurredAt: z.string(),
  subject: z
    .object({
      programId: z.string().optional(),
      enrollmentId: z.string().optional(),
      lessonId: z.string().optional(),
      bookingId: z.string().optional(),
      serviceId: z.string().optional(),
    })
    .optional(),
  payload: z.record(z.string(), z.unknown()),
});

export type IntegrationEventEnvelope<TPayload = Record<string, unknown>> = Omit<
  z.infer<typeof IntegrationEventEnvelopeSchema>,
  'payload'
> & {
  payload: TPayload;
};

// ==========================================
// 6. Cross-Product Request Contracts & References
// ==========================================
export const LearningNextActionRequestSchema = z.object({
  organizationId: z.string(),
  contactId: z.string(),
  source: z.literal('PROMOTORCLASS'),
  sourceEventId: z.string(),
  sourceSignalId: z.string().optional(),
  actionType: z.enum(['FOLLOW_UP', 'MANUAL']),
  title: z.string(),
  reason: z.string(),
  dueAt: z.string().optional(),
  context: z.object({
    programId: z.string().optional(),
    programTitle: z.string().optional(),
    enrollmentId: z.string().optional(),
    signalType: z.string().optional(),
    intentLabel: z.enum(['cold', 'warm', 'hot']).optional(),
  }),
  idempotencyKey: z.string(),
});

export type LearningNextActionRequest = z.infer<typeof LearningNextActionRequestSchema>;

export interface FlowNextActionRef {
  id: string;
  contactId: string;
  nextActionId: string;
  title: string;
  createdAt: string;
}

export interface FlowContactContext {
  contactId: string;
  stage: 'NEW' | 'CONTACTED' | 'INTERESTED' | 'FOLLOW_UP' | 'BOOKED' | 'COMPLETED' | 'LOST';
  classification: 'PROSPECT' | 'CLIENT';
  primaryNextAction?: {
    id: string;
    type: string;
    dueAt: string | null;
  };
  activeBooking?: {
    id: string;
    serviceId: string;
    startAt: string;
    status: string;
  };
}

export type AssessmentStatus = 'NOT_STARTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'UNKNOWN';

export interface LearningContext {
  contactId: string;
  activeEnrollments: Array<{
    enrollmentId: string;
    programId: string;
    programTitle: string;
    progressPercent: number;
    learningStatus: string;
    intentLabel: 'cold' | 'warm' | 'hot';
    lastActivityAt: string | null;
  }>;
  recentSignals: Array<{
    type: string;
    reason: string;
    priority: number;
    createdAt: string;
  }>;
}

export const EnrollContactInputSchema = z.object({
  organizationId: z.string(),
  contactId: z.string(),
  programId: z.string(),
  source: z.enum(['PROMOTORFLOW_AFTERSALES', 'PROMOTORFLOW_MANUAL']),
  idempotencyKey: z.string(),
});

export type EnrollContactInput = z.infer<typeof EnrollContactInputSchema>;

export const EligibleProgramsInputSchema = z.object({
  organizationId: z.string(),
  contactId: z.string(),
  category: z.string().optional(),
});

export type EligibleProgramsInput = z.infer<typeof EligibleProgramsInputSchema>;

export const ProgramSummarySchema = z.object({
  programId: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  programType: z.enum(['lead_magnet', 'aftersales', 'paid', 'private', 'challenge']),
  pricing: z.enum(['free', 'one_time']),
  priceAmount: z.number().optional(),
});

export type ProgramSummary = z.infer<typeof ProgramSummarySchema>;

export const EnrollmentRefSchema = z.object({
  enrollmentId: z.string(),
  contactId: z.string(),
  programId: z.string(),
  status: z.string(),
  enrolledAt: z.string(),
});

export type EnrollmentRef = z.infer<typeof EnrollmentRefSchema>;

export const EnrollmentStatusSchema = z.object({
  enrollmentId: z.string(),
  status: z.enum(['aktif', 'selesai', 'dibatalkan']),
  progressPercent: z.number().min(0).max(100),
  enrolledAt: z.string(),
  completedAt: z.string().optional(),
});

export type EnrollmentStatus = z.infer<typeof EnrollmentStatusSchema>;

// ==========================================
// 7. Canonical Adapter Interfaces
// ==========================================
export interface PromotorFlowAdapter {
  getContactContext(contactId: string): Promise<FlowContactContext>;
  getAssessmentStatus(contactId: string): Promise<AssessmentStatus>;
  createNextAction(input: LearningNextActionRequest): Promise<FlowNextActionRef>;
  appendLearningActivity(input: LearningActivityProjection): Promise<void>;
}

export interface PromotorClassAdapter {
  getLearningContext(contactId: string): Promise<LearningContext>;
  listEligiblePrograms(input: EligibleProgramsInput): Promise<ProgramSummary[]>;
  enrollContact(input: EnrollContactInput): Promise<EnrollmentRef>;
  getEnrollmentStatus(contactId: string, programId: string): Promise<EnrollmentStatus | null>;
}

// Internal Outbox Queue Item
export interface IntegrationOutboxItem {
  id: string;
  idempotencyKey: string;
  envelope: IntegrationEventEnvelope;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  createdAt: string;
  sentAt?: string;
}

// Product Entitlements & Health
export interface ProductEntitlements {
  promotorClass: boolean;
  promotorFlow: boolean;
}

export interface IntegrationHealth {
  promotorFlow: 'AVAILABLE' | 'UNAVAILABLE';
}
