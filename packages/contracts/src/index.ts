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
export const ProgramTypeSchema = z.enum(['lead_magnet', 'aftersales', 'paid', 'private', 'challenge']);
export type ProgramType = z.infer<typeof ProgramTypeSchema>;

export const ActiveProgramTypeSchema = z.enum(['lead_magnet', 'aftersales', 'paid', 'private']);
export type ActiveProgramType = z.infer<typeof ActiveProgramTypeSchema>;

export const AccessTypeSchema = z.enum(['public', 'private', 'manual']);
export type AccessType = z.infer<typeof AccessTypeSchema>;

export const ProgramStatusSchema = z.enum(['draft', 'published', 'archived']);
export type ProgramStatus = z.infer<typeof ProgramStatusSchema>;

export const ProgramPricingSchema = z.enum(['free', 'one_time']);
export type ProgramPricing = z.infer<typeof ProgramPricingSchema>;

export const ReflectionTypeSchema = z.enum(['long_text', 'single_select', 'multi_select']);
export type ReflectionType = z.infer<typeof ReflectionTypeSchema>;

export const CtaTypeSchema = z.enum(['WHATSAPP', 'FLOW_BOOKING', 'EXTERNAL', 'ENROLL_PROGRAM']);
export type CtaType = z.infer<typeof CtaTypeSchema>;

export const ReflectionOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});
export type ReflectionOption = z.infer<typeof ReflectionOptionSchema>;

export const LessonAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string(),
  sizeFormatted: z.string().optional().nullable(),
  kind: z.enum(['image', 'download']).optional(),
  order: z.number().optional(),
});

export type LessonAttachment = z.infer<typeof LessonAttachmentSchema>;

export const LessonSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string(),
  order: z.number(),
  textContent: z.string().optional().nullable(),
  videoProvider: z.enum(['youtube']).optional().nullable(),
  videoYoutubeUrl: z.string().optional().nullable(),
  videoExternalId: z.string().optional().nullable(),
  attachments: z.array(LessonAttachmentSchema).optional(),
  hasReflection: z.boolean().optional(),
  reflectionType: ReflectionTypeSchema.optional().nullable(),
  reflectionPrompt: z.string().optional().nullable(),
  reflectionOptions: z.array(ReflectionOptionSchema).optional().nullable(),
  hasCta: z.boolean().optional(),
  ctaType: CtaTypeSchema.optional().nullable(),
  ctaLabel: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  ctaTargetProgramId: z.string().optional().nullable(),
  ctaConfig: z.record(z.string(), z.unknown()).optional().nullable(),
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

export const LearningOutcomeSchema = z.object({
  title: z.string(),
  description: z.string(),
});
export type LearningOutcome = z.infer<typeof LearningOutcomeSchema>;

export const ProgramPublicPresentationSchema = z.object({
  coverVariant: z.enum(['cover-a', 'cover-b', 'cover-c']),
  featured: z.boolean().default(false),
  imageUrl: z.string().optional().nullable(),
  heroEyebrow: z.string().optional().nullable(),
  shortOutcome: z.string().optional().nullable(),
  durationLabel: z.string().optional().nullable(),
  learningOutcomes: z.array(LearningOutcomeSchema).default([]),
});
export type ProgramPublicPresentation = z.infer<typeof ProgramPublicPresentationSchema>;

export const ProgramSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  workspaceSlug: z.string(),
  programSlug: z.string(),
  title: z.string(),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  programType: ProgramTypeSchema,
  accessType: AccessTypeSchema,
  status: ProgramStatusSchema,
  pricing: ProgramPricingSchema,
  priceAmount: z.number().default(0),
  publishedAt: z.string().optional().nullable(),
  presentation: ProgramPublicPresentationSchema.optional().nullable(),
  modules: z.array(ModuleSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Program = z.infer<typeof ProgramSchema>;

export const PublicWorkspaceProfileSchema = z.object({
  workspaceSlug: z.string(),
  displayName: z.string(),
  tagline: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  roleLabel: z.string().optional().nullable(),
  heroProgramId: z.string().nullable(),
  whatsappPhoneE164: PhoneE164Schema.optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  stats: z.object({
    familiesHelped: z.string().optional(),
    programCount: z.union([z.string(), z.number()]).optional(),
    location: z.string().optional(),
  }),
});
export type PublicWorkspaceProfile = z.infer<typeof PublicWorkspaceProfileSchema>;

export const PublicLessonPreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  hasVideo: z.boolean(),
  hasReflection: z.boolean(),
});
export type PublicLessonPreview = z.infer<typeof PublicLessonPreviewSchema>;

export const PublicModulePreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  order: z.number(),
  lessons: z.array(PublicLessonPreviewSchema),
});
export type PublicModulePreview = z.infer<typeof PublicModulePreviewSchema>;

export const PublicProgramSummarySchema = z.object({
  id: z.string(),
  workspaceSlug: z.string(),
  programSlug: z.string(),
  title: z.string(),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  programType: ProgramTypeSchema,
  accessType: AccessTypeSchema,
  pricing: ProgramPricingSchema,
  priceAmount: z.number(),
  publishedAt: z.string().optional().nullable(),
  totalLessonsCount: z.number(),
  totalModulesCount: z.number(),
});
export type PublicProgramSummary = z.infer<typeof PublicProgramSummarySchema>;

export const PublicProgramCatalogItemSchema = z.object({
  program: PublicProgramSummarySchema,
  presentation: ProgramPublicPresentationSchema,
  isRegistrationAllowed: z.boolean(),
  registrationStatusNotice: z.string().optional(),
});
export type PublicProgramCatalogItem = z.infer<typeof PublicProgramCatalogItemSchema>;

export const PublicProgramDetailSchema = z.object({
  program: PublicProgramSummarySchema.extend({
    modules: z.array(PublicModulePreviewSchema),
  }),
  presentation: ProgramPublicPresentationSchema,
  promoter: PublicWorkspaceProfileSchema,
  isRegistrationAllowed: z.boolean(),
  registrationStatusNotice: z.string().optional(),
});
export type PublicProgramDetail = z.infer<typeof PublicProgramDetailSchema>;

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
  reflectionType: ReflectionTypeSchema,
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
  interest?: string | null;
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
  programType: ProgramTypeSchema,
  pricing: ProgramPricingSchema,
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

// ==========================================
// 8. B3 Program Management DTO Schemas
// ==========================================
export const CreateProgramRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  programType: ActiveProgramTypeSchema,
  priceAmount: z.number().min(0).optional(),
  heroEyebrow: z.string().optional().nullable(),
  durationLabel: z.string().optional().nullable(),
  coverVariant: z.enum(['cover-a', 'cover-b', 'cover-c']).optional(),
  imageUrl: z.string().optional().nullable(),
  outcomes: z.array(LearningOutcomeSchema).optional(),
});
export type CreateProgramRequest = z.infer<typeof CreateProgramRequestSchema>;

export const UpdateProgramRequestSchema = z.object({
  title: z.string().min(1).optional(),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  programType: ActiveProgramTypeSchema.optional(),
  accessType: AccessTypeSchema.optional(),
  pricing: ProgramPricingSchema.optional(),
  priceAmount: z.number().min(0).optional(),
});
export type UpdateProgramRequest = z.infer<typeof UpdateProgramRequestSchema>;

export const UpdateProgramPresentationRequestSchema = z.object({
  coverVariant: z.enum(['cover-a', 'cover-b', 'cover-c']).optional(),
  featured: z.boolean().optional(),
  imageUrl: z.string().optional().nullable(),
  heroEyebrow: z.string().optional().nullable(),
  shortOutcome: z.string().optional().nullable(),
  durationLabel: z.string().optional().nullable(),
  learningOutcomes: z.array(LearningOutcomeSchema).optional(),
});
export type UpdateProgramPresentationRequest = z.infer<typeof UpdateProgramPresentationRequestSchema>;

export const UpdateWorkspaceProfileRequestSchema = z.object({
  displayName: z.string().min(1).optional(),
  tagline: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  roleLabel: z.string().optional().nullable(),
  heroProgramId: z.string().nullable().optional(),
  whatsappPhoneE164: PhoneE164Schema.optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  stats: z.object({
    familiesHelped: z.string().optional(),
    location: z.string().optional(),
  }).optional(),
});
export type UpdateWorkspaceProfileRequest = z.infer<typeof UpdateWorkspaceProfileRequestSchema>;

export const CreateModuleRequestSchema = z.object({
  title: z.string().min(1, 'Module title is required'),
});
export type CreateModuleRequest = z.infer<typeof CreateModuleRequestSchema>;

export const UpdateModuleRequestSchema = z.object({
  title: z.string().min(1, 'Module title is required'),
});
export type UpdateModuleRequest = z.infer<typeof UpdateModuleRequestSchema>;

export const ReorderModulesRequestSchema = z.object({
  orderedModuleIds: z.array(z.string().uuid()),
});
export type ReorderModulesRequest = z.infer<typeof ReorderModulesRequestSchema>;

export const CreateLessonRequestSchema = z.object({
  title: z.string().min(1, 'Lesson title is required'),
  videoUrl: z.string().optional().nullable(),
});
export type CreateLessonRequest = z.infer<typeof CreateLessonRequestSchema>;

export const UpsertLessonAttachmentRequestSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  url: z.string().url(),
  sizeFormatted: z.string().optional().nullable(),
  kind: z.enum(['image', 'download']),
  order: z.number().int().positive().optional(),
});
export type UpsertLessonAttachmentRequest = z.infer<typeof UpsertLessonAttachmentRequestSchema>;

export const UpsertLessonRequestSchema = z.object({
  title: z.string().min(1, 'Lesson title is required'),
  order: z.number().int().positive().optional(),
  textContent: z.string().optional().nullable(),
  videoProvider: z.enum(['youtube']).optional().nullable(),
  videoUrl: z.string().optional().nullable(),
  videoExternalId: z.string().optional().nullable(),
  reflectionType: ReflectionTypeSchema.optional().nullable(),
  reflectionPrompt: z.string().optional().nullable(),
  reflectionOptions: z.array(ReflectionOptionSchema).optional().nullable(),
  ctaType: CtaTypeSchema.optional().nullable(),
  ctaLabel: z.string().optional().nullable(),
  ctaTargetProgramId: z.string().uuid().optional().nullable(),
  ctaConfig: z.record(z.string(), z.unknown()).optional().nullable(),
  attachments: z.array(UpsertLessonAttachmentRequestSchema).optional(),
});
export type UpsertLessonRequest = z.infer<typeof UpsertLessonRequestSchema>;

export const ReorderLessonsRequestSchema = z.object({
  orderedLessonIds: z.array(z.string().uuid()),
});
export type ReorderLessonsRequest = z.infer<typeof ReorderLessonsRequestSchema>;
