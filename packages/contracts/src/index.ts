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
  bankTransferEnabled: z.boolean().default(false),
  whatsAppEnabled: z.boolean().default(false),
  publishedAt: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  presentation: ProgramPublicPresentationSchema.optional().nullable(),
  modules: z.array(ModuleSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Program = z.infer<typeof ProgramSchema>;

// ==========================================
// 3b. Storefront Brand Customization Contracts
// ==========================================
export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid 6-character hex color (#RRGGBB)');

export type HexColor = z.infer<typeof HexColorSchema>;

export const StorefrontStylePresetSchema = z.enum(['MODERNIST', 'SOFT', 'MINIMAL', 'EDITORIAL']);
export type StorefrontStylePreset = z.infer<typeof StorefrontStylePresetSchema>;

export const StorefrontFontPresetSchema = z.enum(['ARCHIVO', 'INTER', 'MANROPE', 'LORA']);
export type StorefrontFontPreset = z.infer<typeof StorefrontFontPresetSchema>;

export const StorefrontRadiusPresetSchema = z.enum(['SHARP', 'SOFT', 'ROUNDED']);
export type StorefrontRadiusPreset = z.infer<typeof StorefrontRadiusPresetSchema>;

export const StorefrontButtonPresetSchema = z.enum(['SOLID', 'OUTLINE', 'SOFT']);
export type StorefrontButtonPreset = z.infer<typeof StorefrontButtonPresetSchema>;

export const StorefrontLayoutPresetSchema = z.enum(['LIST', 'GRID']);
export type StorefrontLayoutPreset = z.infer<typeof StorefrontLayoutPresetSchema>;

export const HeroAlignmentSchema = z.enum(['LEFT', 'CENTER']);
export type HeroAlignment = z.infer<typeof HeroAlignmentSchema>;

export const StorefrontThemeSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  brandName: z.string().min(1, 'Brand name cannot be empty').max(100),
  tagline: z.string().max(255).optional().nullable(),
  logoUrl: z.string().url().regex(/^https:\/\//, 'Logo URL must use HTTPS').optional().nullable(),
  primaryColor: HexColorSchema,
  accentColor: HexColorSchema,
  backgroundColor: HexColorSchema,
  surfaceColor: HexColorSchema,
  textColor: HexColorSchema,
  mutedTextColor: HexColorSchema,
  stylePreset: StorefrontStylePresetSchema,
  fontPreset: StorefrontFontPresetSchema,
  radiusPreset: StorefrontRadiusPresetSchema,
  buttonPreset: StorefrontButtonPresetSchema,
  layoutPreset: StorefrontLayoutPresetSchema,
  heroAlignment: HeroAlignmentSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type StorefrontTheme = z.infer<typeof StorefrontThemeSchema>;

export const UpdateStorefrontThemeRequestSchema = z.object({
  brandName: z.string().min(1, 'Brand name cannot be empty').max(100),
  tagline: z.string().max(255).optional().nullable(),
  logoUrl: z.string().url().regex(/^https:\/\//, 'Logo URL must use HTTPS').optional().nullable(),
  primaryColor: HexColorSchema,
  accentColor: HexColorSchema,
  backgroundColor: HexColorSchema,
  surfaceColor: HexColorSchema,
  textColor: HexColorSchema,
  mutedTextColor: HexColorSchema,
  stylePreset: StorefrontStylePresetSchema,
  fontPreset: StorefrontFontPresetSchema,
  radiusPreset: StorefrontRadiusPresetSchema,
  buttonPreset: StorefrontButtonPresetSchema,
  layoutPreset: StorefrontLayoutPresetSchema,
  heroAlignment: HeroAlignmentSchema,
});
export type UpdateStorefrontThemeRequest = z.infer<typeof UpdateStorefrontThemeRequestSchema>;

export const PublicStorefrontThemeSchema = z.object({
  brandName: z.string(),
  tagline: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  primaryColor: HexColorSchema,
  accentColor: HexColorSchema,
  backgroundColor: HexColorSchema,
  surfaceColor: HexColorSchema,
  textColor: HexColorSchema,
  mutedTextColor: HexColorSchema,
  stylePreset: StorefrontStylePresetSchema,
  fontPreset: StorefrontFontPresetSchema,
  radiusPreset: StorefrontRadiusPresetSchema,
  buttonPreset: StorefrontButtonPresetSchema,
  layoutPreset: StorefrontLayoutPresetSchema,
  heroAlignment: HeroAlignmentSchema,
});
export type PublicStorefrontTheme = z.infer<typeof PublicStorefrontThemeSchema>;

export const TALIRA_DEFAULT_STOREFRONT_THEME: PublicStorefrontTheme = {
  brandName: 'Talira Class',
  tagline: null,
  logoUrl: null,
  primaryColor: '#201e1d',
  accentColor: '#ec3013',
  backgroundColor: '#f3f2f2',
  surfaceColor: '#ffffff',
  textColor: '#201e1d',
  mutedTextColor: '#5a5954',
  stylePreset: 'MODERNIST',
  fontPreset: 'ARCHIVO',
  radiusPreset: 'SHARP',
  buttonPreset: 'SOLID',
  layoutPreset: 'LIST',
  heroAlignment: 'LEFT',
};

export const STYLE_PRESET_TOKENS: Record<StorefrontStylePreset, Omit<PublicStorefrontTheme, 'brandName' | 'tagline' | 'logoUrl'>> = {
  MODERNIST: {
    primaryColor: '#201e1d',
    accentColor: '#ec3013',
    backgroundColor: '#f3f2f2',
    surfaceColor: '#ffffff',
    textColor: '#201e1d',
    mutedTextColor: '#5a5954',
    stylePreset: 'MODERNIST',
    fontPreset: 'ARCHIVO',
    radiusPreset: 'SHARP',
    buttonPreset: 'SOLID',
    layoutPreset: 'LIST',
    heroAlignment: 'LEFT',
  },
  SOFT: {
    primaryColor: '#2d3a34',
    accentColor: '#437a65',
    backgroundColor: '#f7f6f2',
    surfaceColor: '#ffffff',
    textColor: '#242c28',
    mutedTextColor: '#637069',
    stylePreset: 'SOFT',
    fontPreset: 'MANROPE',
    radiusPreset: 'ROUNDED',
    buttonPreset: 'SOFT',
    layoutPreset: 'GRID',
    heroAlignment: 'CENTER',
  },
  MINIMAL: {
    primaryColor: '#111827',
    accentColor: '#4b5563',
    backgroundColor: '#fafafa',
    surfaceColor: '#ffffff',
    textColor: '#111827',
    mutedTextColor: '#6b7280',
    stylePreset: 'MINIMAL',
    fontPreset: 'INTER',
    radiusPreset: 'SOFT',
    buttonPreset: 'SOLID',
    layoutPreset: 'LIST',
    heroAlignment: 'LEFT',
  },
  EDITORIAL: {
    primaryColor: '#1c1917',
    accentColor: '#c2410c',
    backgroundColor: '#f5f2eb',
    surfaceColor: '#ffffff',
    textColor: '#1c1917',
    mutedTextColor: '#57534e',
    stylePreset: 'EDITORIAL',
    fontPreset: 'LORA',
    radiusPreset: 'SHARP',
    buttonPreset: 'OUTLINE',
    layoutPreset: 'LIST',
    heroAlignment: 'CENTER',
  },
};

// ==========================================
// 3c. Color, Contrast & Token Utilities
// ==========================================
export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex.trim());
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

export function getLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return 0;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function getReadableTextColor(bgHex: string): '#FFFFFF' | '#111827' {
  const contrastWithWhite = getContrastRatio('#FFFFFF', bgHex);
  const contrastWithDark = getContrastRatio('#111827', bgHex);
  return contrastWithWhite >= contrastWithDark ? '#FFFFFF' : '#111827';
}

export function validateThemeContrast(theme: PublicStorefrontTheme): {
  isAccessible: boolean;
  issues: string[];
  contrastRatios: {
    textOnBackground: number;
    textOnSurface: number;
    mutedOnBackground: number;
    mutedOnSurface: number;
    primaryBtnContrast: number;
    accentBtnContrast: number;
  };
} {
  const textOnBackground = getContrastRatio(theme.textColor, theme.backgroundColor);
  const textOnSurface = getContrastRatio(theme.textColor, theme.surfaceColor);
  const mutedOnBackground = getContrastRatio(theme.mutedTextColor, theme.backgroundColor);
  const mutedOnSurface = getContrastRatio(theme.mutedTextColor, theme.surfaceColor);

  const primaryBtnFg = getReadableTextColor(theme.primaryColor);
  const primaryBtnContrast = getContrastRatio(primaryBtnFg, theme.primaryColor);

  const accentBtnFg = getReadableTextColor(theme.accentColor);
  const accentBtnContrast = getContrastRatio(accentBtnFg, theme.accentColor);

  const issues: string[] = [];
  if (textOnBackground < 4.5) {
    issues.push(`Kontras teks pada latar belakang (${textOnBackground}:1) di bawah standar WCAG AA 4.5:1`);
  }
  if (textOnSurface < 4.5) {
    issues.push(`Kontras teks pada kartu/permukaan (${textOnSurface}:1) di bawah standar WCAG AA 4.5:1`);
  }
  if (mutedOnBackground < 3.0) {
    issues.push(`Kontras teks sekunder pada latar belakang (${mutedOnBackground}:1) di bawah 3:1`);
  }
  if (mutedOnSurface < 3.0) {
    issues.push(`Kontras teks sekunder pada kartu/permukaan (${mutedOnSurface}:1) di bawah 3:1`);
  }

  return {
    isAccessible: issues.length === 0,
    issues,
    contrastRatios: {
      textOnBackground,
      textOnSurface,
      mutedOnBackground,
      mutedOnSurface,
      primaryBtnContrast,
      accentBtnContrast,
    },
  };
}

export const FONT_PRESET_FAMILY_MAP: Record<StorefrontFontPreset, string> = {
  ARCHIVO: "'Archivo', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  INTER: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  MANROPE: "'Manrope', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  LORA: "'Lora', Georgia, 'Times New Roman', Cambria, serif",
};

export const RADIUS_PRESET_VALUE_MAP: Record<StorefrontRadiusPreset, { sm: string; md: string; lg: string; pill: string }> = {
  SHARP: { sm: '0px', md: '0px', lg: '0px', pill: '0px' },
  SOFT: { sm: '4px', md: '6px', lg: '8px', pill: '9999px' },
  ROUNDED: { sm: '8px', md: '12px', lg: '16px', pill: '9999px' },
};

export function generateStorefrontCssVariables(theme: PublicStorefrontTheme): Record<string, string> {
  const font = FONT_PRESET_FAMILY_MAP[theme.fontPreset] || FONT_PRESET_FAMILY_MAP.ARCHIVO;
  const radius = RADIUS_PRESET_VALUE_MAP[theme.radiusPreset] || RADIUS_PRESET_VALUE_MAP.SHARP;
  const primaryFg = getReadableTextColor(theme.primaryColor);
  const accentFg = getReadableTextColor(theme.accentColor);

  return {
    '--brand-primary': theme.primaryColor,
    '--brand-primary-fg': primaryFg,
    '--brand-accent': theme.accentColor,
    '--brand-accent-fg': accentFg,
    '--brand-bg': theme.backgroundColor,
    '--brand-surface': theme.surfaceColor,
    '--brand-text': theme.textColor,
    '--brand-muted': theme.mutedTextColor,
    '--brand-radius-sm': radius.sm,
    '--brand-radius': radius.md,
    '--brand-radius-lg': radius.lg,
    '--brand-font': font,
    '--brand-btn-preset': theme.buttonPreset,
    '--brand-layout-preset': theme.layoutPreset,
    '--brand-hero-align': theme.heroAlignment,
  };
}

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
  theme: PublicStorefrontThemeSchema.optional().nullable(),
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
  bankTransferEnabled: z.boolean().default(false),
  whatsAppEnabled: z.boolean().default(false),
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
export const PresignCoverUploadRequestSchema = z.object({
  fileName: z.string().min(1, 'Nama file wajib diisi'),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  contentLength: z.number().int().min(1).max(2097152, 'Ukuran file maks 2MB (2097152 bytes)'),
});
export type PresignCoverUploadRequest = z.infer<typeof PresignCoverUploadRequestSchema>;

export const PresignCoverUploadResponseSchema = z.object({
  key: z.string(),
  uploadUrl: z.string(),
  publicUrl: z.string(),
  contentType: z.string(),
  contentLength: z.number(),
  expiresAt: z.string(),
  maxBytes: z.number(),
});
export type PresignCoverUploadResponse = z.infer<typeof PresignCoverUploadResponseSchema>;

export const ConfirmCoverUploadRequestSchema = z.object({
  key: z.string().min(1),
  contentType: z.string(),
  contentLength: z.number().optional(),
});
export type ConfirmCoverUploadRequest = z.infer<typeof ConfirmCoverUploadRequestSchema>;

export const CreateProgramRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  programType: ActiveProgramTypeSchema,
  priceAmount: z.number().min(0).optional(),
  bankTransferEnabled: z.boolean().optional(),
  whatsAppEnabled: z.boolean().optional(),
  heroEyebrow: z.string().optional().nullable(),
  durationLabel: z.string().optional().nullable(),
  coverVariant: z.enum(['cover-a', 'cover-b', 'cover-c']).optional(),
  imageUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
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
  bankTransferEnabled: z.boolean().optional(),
  whatsAppEnabled: z.boolean().optional(),
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

// ==========================================
// 8. Flow HTTP Transport Contracts (§12)
// ==========================================

// --- Contacts ---
export const ContactLifecycleStageSchema = z.enum([
  'NEW',
  'CONTACTED',
  'INTERESTED',
  'FOLLOW_UP',
  'BOOKED',
  'COMPLETED',
  'LOST',
]);
export type ContactLifecycleStage = z.infer<typeof ContactLifecycleStageSchema>;

export const ContactClassificationSchema = z.enum(['PROSPECT', 'CLIENT']);
export type ContactClassification = z.infer<typeof ContactClassificationSchema>;

export const CreateFlowContactRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phoneRaw: z.string().min(1, 'Phone is required'),
  interest: z.string().min(1, 'Interest is required on Flow contact creation'),
  email: z.string().email().optional().nullable(),
  sourceChannel: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type CreateFlowContactRequest = z.infer<typeof CreateFlowContactRequestSchema>;

export const UpdateFlowContactProfileRequestSchema = z.object({
  interest: z.string().optional().nullable(),
  sourceChannel: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});
export type UpdateFlowContactProfileRequest = z.infer<typeof UpdateFlowContactProfileRequestSchema>;

export const TransitionFlowContactStageRequestSchema = z.object({
  stage: ContactLifecycleStageSchema,
  lostReason: z.string().optional().nullable(),
});
export type TransitionFlowContactStageRequest = z.infer<typeof TransitionFlowContactStageRequestSchema>;

export const ListFlowContactsQuerySchema = z.object({
  search: z.string().optional(),
  classification: ContactClassificationSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export type ListFlowContactsQuery = z.infer<typeof ListFlowContactsQuerySchema>;

// --- Next Actions & Today ---
export const FlowNextActionTypeSchema = z.enum([
  'FOLLOW_UP',
  'MANUAL',
  'WHATSAPP_FOLLOW_UP',
  'AFTERCARE',
]);
export type FlowNextActionType = z.infer<typeof FlowNextActionTypeSchema>;

export const FlowNextActionStatusSchema = z.enum([
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'SKIPPED',
]);
export type FlowNextActionStatus = z.infer<typeof FlowNextActionStatusSchema>;

export const ListNextActionsQuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  status: FlowNextActionStatusSchema.optional(),
});
export type ListNextActionsQuery = z.infer<typeof ListNextActionsQuerySchema>;

export const CreateNextActionRequestSchema = z.object({
  contactId: z.string().uuid('Valid contactId is required'),
  actionType: FlowNextActionTypeSchema,
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  priority: z.number().int().min(0).max(100).optional(),
});
export type CreateNextActionRequest = z.infer<typeof CreateNextActionRequestSchema>;

export const CompleteNextActionRequestSchema = z.object({
  confirmedWhatsAppSent: z.boolean().optional(),
});
export type CompleteNextActionRequest = z.infer<typeof CompleteNextActionRequestSchema>;

export const SkipNextActionRequestSchema = z.object({
  nextStep: z.object({
    type: FlowNextActionTypeSchema,
    dueAt: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  }),
});
export type SkipNextActionRequest = z.infer<typeof SkipNextActionRequestSchema>;

export const RescheduleNextActionRequestSchema = z.object({
  dueAt: z.string().min(1, 'dueAt is required'),
});
export type RescheduleNextActionRequest = z.infer<typeof RescheduleNextActionRequestSchema>;

export const AftercareOutcomeSchema = z.enum([
  'NO_NEED',
  'HAS_QUESTION',
  'INTERESTED_NEXT_SESSION',
  'CONTACT_LATER',
]);
export type AftercareOutcome = z.infer<typeof AftercareOutcomeSchema>;

export const CompleteAftercareActionRequestSchema = z.object({
  outcome: AftercareOutcomeSchema,
  notes: z.string().optional().nullable(),
});
export type CompleteAftercareActionRequest = z.infer<typeof CompleteAftercareActionRequestSchema>;

// --- Services ---
export const FlowServiceCategorySchema = z.enum([
  'ASSESSMENT',
  'SESSION',
  'PROGRAM',
  'OTHER',
]);
export type FlowServiceCategory = z.infer<typeof FlowServiceCategorySchema>;

export const CreateFlowServiceRequestSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional().nullable(),
  category: FlowServiceCategorySchema,
  priceAmount: z.number().int().min(0, 'priceAmount must be non-negative'),
  depositAmount: z.number().int().min(0, 'depositAmount must be non-negative').optional().nullable(),
  durationMinutes: z.number().int().min(1, 'durationMinutes must be at least 1 minute'),
  isActive: z.boolean().optional(),
});
export type CreateFlowServiceRequest = z.infer<typeof CreateFlowServiceRequestSchema>;

export const UpdateFlowServiceRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  category: FlowServiceCategorySchema.optional(),
  priceAmount: z.number().int().min(0).optional(),
  depositAmount: z.number().int().min(0).optional().nullable(),
  durationMinutes: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateFlowServiceRequest = z.infer<typeof UpdateFlowServiceRequestSchema>;

// --- Message Templates ---
export const MessageTemplateCategorySchema = z.enum([
  'CONTACT_LEAD',
  'FOLLOW_UP',
  'CONFIRM_BOOKING',
  'REMIND_PAYMENT',
  'REMIND_BOOKING',
  'AFTERCARE',
]);
export type MessageTemplateCategory = z.infer<typeof MessageTemplateCategorySchema>;

export const ListMessageTemplatesQuerySchema = z.object({
  category: MessageTemplateCategorySchema.optional(),
});
export type ListMessageTemplatesQuery = z.infer<typeof ListMessageTemplatesQuerySchema>;

export const CreateMessageTemplateRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: MessageTemplateCategorySchema,
  bodyText: z.string().min(1, 'bodyText is required'),
  isActive: z.boolean().optional(),
});
export type CreateMessageTemplateRequest = z.infer<typeof CreateMessageTemplateRequestSchema>;

export const UpdateMessageTemplateRequestSchema = z.object({
  title: z.string().min(1).optional(),
  category: MessageTemplateCategorySchema.optional(),
  bodyText: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateMessageTemplateRequest = z.infer<typeof UpdateMessageTemplateRequestSchema>;

// --- Aftercare ---
export const AftercareRecordStatusSchema = z.enum(['PENDING', 'COMPLETED']);
export type AftercareRecordStatus = z.infer<typeof AftercareRecordStatusSchema>;

export const ListAftercareQuerySchema = z.object({
  status: AftercareRecordStatusSchema.optional(),
});
export type ListAftercareQuery = z.infer<typeof ListAftercareQuerySchema>;

// --- Bookings ---
export const FlowBookingLocationTypeSchema = z.enum(['ONLINE', 'ON_SITE', 'HOME_VISIT']);
export type FlowBookingLocationType = z.infer<typeof FlowBookingLocationTypeSchema>;

export const FlowBookingStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);
export type FlowBookingStatus = z.infer<typeof FlowBookingStatusSchema>;

export const FlowPaymentStatusSchema = z.enum(['UNPAID', 'PAID', 'WAIVED']);
export type FlowPaymentStatus = z.infer<typeof FlowPaymentStatusSchema>;

export const ListBookingsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  contactId: z.string().uuid().optional(),
  status: FlowBookingStatusSchema.optional(),
});
export type ListBookingsQuery = z.infer<typeof ListBookingsQuerySchema>;
export const CreateBookingRequestSchema = z.object({
  contactId: z.string().uuid('Valid contactId is required'),
  serviceId: z.string().uuid('Valid serviceId is required'),
  startAt: z.string().min(1, 'startAt is required'),
  endAt: z.string().optional().nullable(),
  locationType: FlowBookingLocationTypeSchema.optional(),
  locationText: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  idempotencyKey: z.string().optional().nullable(),
});
export type CreateBookingRequest = z.infer<typeof CreateBookingRequestSchema>;

export const RescheduleBookingRequestSchema = z.object({
  startAt: z.string().min(1, 'startAt is required'),
  endAt: z.string().optional().nullable(),
});
export type RescheduleBookingRequest = z.infer<typeof RescheduleBookingRequestSchema>;

export const CancelBookingRequestSchema = z.object({
  cancellationReason: z.string().optional().nullable(),
});
export type CancelBookingRequest = z.infer<typeof CancelBookingRequestSchema>;

// --- Messaging ---
export const WhatsAppOpenedRequestSchema = z.object({
  contactId: z.string().uuid('Valid contactId is required'),
  rawText: z.string().min(1, 'rawText is required'),
});
export type WhatsAppOpenedRequest = z.infer<typeof WhatsAppOpenedRequestSchema>;

export const ConfirmWhatsAppSentRequestSchema = z.object({
  nextActionId: z.string().uuid('Valid nextActionId is required'),
});
export type ConfirmWhatsAppSentRequest = z.infer<typeof ConfirmWhatsAppSentRequestSchema>;

// --- B6.1 Availability & Public Booking ----
export const AvailabilityRuleSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AvailabilityRuleDto = z.infer<typeof AvailabilityRuleSchema>;

export const ReplaceAvailabilityRulesRequestSchema = z.object({
  rules: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'startTime must be HH:mm'),
      endTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'endTime must be HH:mm'),
      isActive: z.boolean().optional(),
    }).refine((r) => r.startTime < r.endTime, {
      message: 'startTime must be earlier than endTime',
      path: ['endTime'],
    })
  ),
});
export type ReplaceAvailabilityRulesRequest = z.infer<typeof ReplaceAvailabilityRulesRequestSchema>;

export const PublicSlotsQuerySchema = z.object({
  serviceId: z.string().uuid('Valid serviceId is required'),
  from: z.string().min(1, 'from timestamp is required'),
  to: z.string().min(1, 'to timestamp is required'),
});
export type PublicSlotsQuery = z.infer<typeof PublicSlotsQuerySchema>;

export const CreatePublicBookingRequestSchema = z.object({
  serviceId: z.string().uuid('Valid serviceId is required'),
  startAt: z.string().min(1, 'startAt timestamp is required'),
  name: z.string().min(1, 'Name is required'),
  phoneRaw: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().nullable(),
  notes: z.string().optional().nullable(),
  locationType: z.enum(['HOME_VISIT', 'ON_SITE', 'ONLINE']).optional(),
  locationText: z.string().optional().nullable(),
});
export type CreatePublicBookingRequest = z.infer<typeof CreatePublicBookingRequestSchema>;

// --- B4 Registration & Enrollment ---
export const PublicRegisterLearnerRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phoneRaw: z.string().min(1, 'Phone is required'),
  email: z.string().email().optional().nullable(),
});
export type PublicRegisterLearnerRequest = z.infer<typeof PublicRegisterLearnerRequestSchema>;

export const PublicRegisterLearnerResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  contactId: z.string().uuid(),
  organizationId: z.string().uuid(),
  programId: z.string().uuid(),
  programTitle: z.string(),
  status: z.string(),
  accessToken: z.string(),
});
export type PublicRegisterLearnerResponse = z.infer<typeof PublicRegisterLearnerResponseSchema>;

export const RedeemLearnerTokenRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});
export type RedeemLearnerTokenRequest = z.infer<typeof RedeemLearnerTokenRequestSchema>;

export const RedeemLearnerTokenResponseSchema = z.object({
  contactId: z.string().uuid(),
  organizationId: z.string().uuid(),
});
export type RedeemLearnerTokenResponse = z.infer<typeof RedeemLearnerTokenResponseSchema>;

export const CreateManualEnrollmentRequestSchema = z.object({
  programId: z.string().uuid('Valid programId is required'),
  contactId: z.string().uuid('Valid contactId is required'),
});
export type CreateManualEnrollmentRequest = z.infer<typeof CreateManualEnrollmentRequestSchema>;

export const CanonicalEnrollmentSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  programId: z.string().uuid(),
  contactId: z.string().uuid(),
  status: z.enum(['ENROLLED', 'STARTED', 'COMPLETED', 'CANCELLED']),
  enrolledAt: z.string(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  lastActivityAt: z.string().nullable().optional(),
  progressPercent: z.number().int().min(0).max(100),
  intentScore: z.number().int().min(0).max(100),
  intentLabel: z.enum(['COLD', 'WARM', 'HOT']),
  learningStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'AT_RISK']),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CanonicalEnrollmentDto = z.infer<typeof CanonicalEnrollmentSchema>;

export const LearningContextResponseSchema = z.object({
  contactId: z.string().uuid(),
  activeEnrollments: z.array(
    z.object({
      enrollmentId: z.string().uuid(),
      programId: z.string().uuid(),
      programTitle: z.string(),
      progressPercent: z.number(),
      learningStatus: z.string(),
      intentLabel: z.string(),
      enrolledAt: z.string(),
    })
  ),
  overallProgressPercent: z.number(),
  highestIntentLabel: z.enum(['COLD', 'WARM', 'HOT']),
  recentSignals: z.array(
    z.object({
      reason: z.string(),
      createdAt: z.string(),
    })
  ),
});
export type LearningContextResponse = z.infer<typeof LearningContextResponseSchema>;

// --- B5 Learning Engine & Intelligence ---
export const CompleteLessonResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  isCompleted: z.boolean(),
  progressPercent: z.number().int().min(0).max(100),
  learningStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  intentScore: z.number().int().min(0).max(100),
  intentLabel: z.enum(['COLD', 'WARM', 'HOT']),
  completedAt: z.string().nullable().optional(),
});
export type CompleteLessonResponse = z.infer<typeof CompleteLessonResponseSchema>;

export const SubmitReflectionRequestSchema = z.object({
  responseText: z.string().optional().nullable(),
  selectedOptions: z.unknown().optional().nullable(),
});
export type SubmitReflectionRequest = z.infer<typeof SubmitReflectionRequestSchema>;

export const SubmitReflectionResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  responseText: z.string().nullable().optional(),
  selectedOptions: z.unknown().nullable().optional(),
  submittedAt: z.string(),
  progressPercent: z.number().int().min(0).max(100),
  learningStatus: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
  intentScore: z.number().int().min(0).max(100),
  intentLabel: z.enum(['COLD', 'WARM', 'HOT']),
});
export type SubmitReflectionResponse = z.infer<typeof SubmitReflectionResponseSchema>;

export const RecordLearningEventRequestSchema = z.object({
  eventType: LearningEventTypeSchema,
  payload: z.record(z.string(), z.unknown()).optional(),
});
export type RecordLearningEventRequest = z.infer<typeof RecordLearningEventRequestSchema>;

export const RecordLearningEventResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  progressPercent: z.number().int().min(0).max(100),
  intentScore: z.number().int().min(0).max(100),
  intentLabel: z.enum(['COLD', 'WARM', 'HOT']),
});
export type RecordLearningEventResponse = z.infer<typeof RecordLearningEventResponseSchema>;

export const LearnerEnrollmentDetailsSchema = z.object({
  enrollment: CanonicalEnrollmentSchema,
  program: z.object({
    id: z.string().uuid(),
    title: z.string(),
    programSlug: z.string(),
    description: z.string().nullable().optional(),
    modules: z.array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        orderIndex: z.number(),
        lessons: z.array(
          z.object({
            id: z.string().uuid(),
            title: z.string(),
            orderIndex: z.number(),
            videoUrl: z.string().nullable().optional(),
            videoProvider: z.string().nullable().optional(),
            reflectionType: z.string().nullable().optional(),
            reflectionPrompt: z.string().nullable().optional(),
            reflectionOptions: z.unknown().nullable().optional(),
            ctaType: z.string().nullable().optional(),
            ctaLabel: z.string().nullable().optional(),
            ctaTargetProgramId: z.string().uuid().nullable().optional(),
            ctaConfig: z.unknown().nullable().optional(),
            isCompleted: z.boolean(),
            completedAt: z.string().nullable().optional(),
            reflection: z
              .object({
                responseText: z.string().nullable().optional(),
                selectedOptions: z.unknown().nullable().optional(),
                submittedAt: z.string(),
              })
              .nullable()
              .optional(),
          })
        ),
      })
    ),
  }),
});
export type LearnerEnrollmentDetailsDto = z.infer<typeof LearnerEnrollmentDetailsSchema>;

export const LearningSignalDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  contactId: z.string().uuid(),
  reason: z.string(),
  status: z.enum(['ACTIVE', 'RESOLVED', 'DISMISSED']),
  metadata: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LearningSignalDto = z.infer<typeof LearningSignalDtoSchema>;

export const UpdateSignalStatusRequestSchema = z.object({
  status: z.enum(['ACTIVE', 'RESOLVED', 'DISMISSED']),
});
export type UpdateSignalStatusRequest = z.infer<typeof UpdateSignalStatusRequestSchema>;

export const StartLessonResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  status: z.enum(['ENROLLED', 'STARTED', 'COMPLETED', 'CANCELLED']),
});
export type StartLessonResponse = z.infer<typeof StartLessonResponseSchema>;

export const RecordCtaClickRequestSchema = z.object({
  ctaLabel: z.string().optional().nullable(),
});
export type RecordCtaClickRequest = z.infer<typeof RecordCtaClickRequestSchema>;

export const RecordCtaClickResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  lessonId: z.string().uuid(),
  progressPercent: z.number().int().min(0).max(100),
  intentScore: z.number().int().min(0).max(100),
  intentLabel: z.enum(['COLD', 'WARM', 'HOT']),
});
export type RecordCtaClickResponse = z.infer<typeof RecordCtaClickResponseSchema>;

export const ProgramAnalyticsResponseSchema = z.object({
  programId: z.string().uuid(),
  programTitle: z.string(),
  enrolledCount: z.number().int().nonnegative(),
  startedCount: z.number().int().nonnegative(),
  reached50Count: z.number().int().nonnegative(),
  reached80Count: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  ctaClickedCount: z.number().int().nonnegative(),
  avgProgressPercent: z.number().int().min(0).max(100),
});
export type ProgramAnalyticsResponse = z.infer<typeof ProgramAnalyticsResponseSchema>;

export const LearnerSummaryItemSchema = z.object({
  contactId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  programId: z.string().uuid(),
  programTitle: z.string(),
  progressPercent: z.number().int().min(0).max(100),
  intentScore: z.number().int().min(0).max(100),
  intentLabel: z.enum(['COLD', 'WARM', 'HOT']),
  learningStatus: z.enum(['ACTIVE', 'COMPLETED', 'INACTIVE', 'AT_RISK', 'NOT_STARTED', 'IN_PROGRESS']),
  lastActivityAt: z.string().nullable().optional(),
  enrolledAt: z.string(),
});
export type LearnerSummaryItem = z.infer<typeof LearnerSummaryItemSchema>;

export const LearnersListResponseSchema = z.object({
  learners: z.array(LearnerSummaryItemSchema),
  total: z.number().int().nonnegative(),
});
export type LearnersListResponse = z.infer<typeof LearnersListResponseSchema>;

// ==========================================
// 3c. Manual Paid Program Commerce Contracts
// ==========================================
export const PurchaseMethodSchema = z.enum(['BANK_TRANSFER', 'WHATSAPP']);
export type PurchaseMethod = z.infer<typeof PurchaseMethodSchema>;

export const PurchaseStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export type PurchaseStatus = z.infer<typeof PurchaseStatusSchema>;

export const ProgramAccessTypeSchema = z.enum(['FREE', 'PAID']);
export type ProgramAccessType = z.infer<typeof ProgramAccessTypeSchema>;

export const CurrencySchema = z.literal('IDR');
export type Currency = z.infer<typeof CurrencySchema>;

export const OrganizationBankAccountSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  bankName: z.string().min(1, 'Nama bank tidak boleh kosong').max(100),
  accountNumber: z.string().min(1, 'Nomor rekening tidak boleh kosong').max(50),
  accountHolderName: z.string().min(1, 'Nama pemilik rekening tidak boleh kosong').max(100),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type OrganizationBankAccount = z.infer<typeof OrganizationBankAccountSchema>;

export const CreateBankAccountRequestSchema = z.object({
  bankName: z.string().min(1, 'Nama bank wajib diisi').max(100),
  accountNumber: z.string().min(1, 'Nomor rekening wajib diisi').max(50),
  accountHolderName: z.string().min(1, 'Nama pemilik rekening wajib diisi').max(100),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional(),
});
export type CreateBankAccountRequest = z.infer<typeof CreateBankAccountRequestSchema>;

export const UpdateBankAccountRequestSchema = z.object({
  bankName: z.string().min(1, 'Nama bank wajib diisi').max(100).optional(),
  accountNumber: z.string().min(1, 'Nomor rekening wajib diisi').max(50).optional(),
  accountHolderName: z.string().min(1, 'Nama pemilik rekening wajib diisi').max(100).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
export type UpdateBankAccountRequest = z.infer<typeof UpdateBankAccountRequestSchema>;

export const OrganizationPaymentSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
  salesWhatsAppNumber: PhoneE164Schema.optional().nullable(),
  bankAccounts: z.array(OrganizationBankAccountSchema).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type OrganizationPaymentSettings = z.infer<typeof OrganizationPaymentSettingsSchema>;

export const UpdatePaymentSettingsRequestSchema = z.object({
  salesWhatsAppNumber: PhoneE164Schema.optional().nullable(),
});
export type UpdatePaymentSettingsRequest = z.infer<typeof UpdatePaymentSettingsRequestSchema>;

export const PublicPaymentInfoSchema = z.object({
  salesWhatsAppNumber: PhoneE164Schema.optional().nullable(),
  bankAccounts: z.array(
    z.object({
      id: z.string(),
      bankName: z.string(),
      accountNumber: z.string(),
      accountHolderName: z.string(),
    })
  ),
});
export type PublicPaymentInfo = z.infer<typeof PublicPaymentInfoSchema>;

export const ProgramPurchaseRequestSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  programId: z.string().uuid(),
  contactId: z.string().uuid(),
  purchaseReference: z.string().min(1),
  purchaseMethod: PurchaseMethodSchema,
  status: PurchaseStatusSchema,
  priceAmount: z.number().int().nonnegative(),
  currency: CurrencySchema.default('IDR'),
  buyerName: z.string().min(1),
  buyerPhone: PhoneE164Schema,
  buyerNote: z.string().optional().nullable(),
  bankAccountId: z.string().uuid().optional().nullable(),
  bankAccountDetails: z
    .object({
      bankName: z.string(),
      accountNumber: z.string(),
      accountHolderName: z.string(),
    })
    .optional()
    .nullable(),
  programTitle: z.string().optional(),
  programSlug: z.string().optional(),
  approvedAt: z.string().optional().nullable(),
  approvedByUserId: z.string().uuid().optional().nullable(),
  rejectedAt: z.string().optional().nullable(),
  rejectedByUserId: z.string().uuid().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
  enrollmentId: z.string().uuid().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProgramPurchaseRequest = z.infer<typeof ProgramPurchaseRequestSchema>;

export const CreatePublicPurchaseRequestSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(100),
  phone: z.string().min(1, 'Nomor WhatsApp wajib diisi').max(30),
  purchaseMethod: PurchaseMethodSchema,
  buyerNote: z.string().max(500).optional().nullable(),
  bankAccountId: z.string().uuid().optional().nullable(),
});
export type CreatePublicPurchaseRequest = z.infer<typeof CreatePublicPurchaseRequestSchema>;

export const CreatePublicPurchaseResponseSchema = z.object({
  purchaseRequest: ProgramPurchaseRequestSchema,
  paymentInstructions: z
    .object({
      programTitle: z.string(),
      priceAmount: z.number().int(),
      formattedPrice: z.string(),
      purchaseReference: z.string(),
      bankAccounts: z.array(
        z.object({
          id: z.string(),
          bankName: z.string(),
          accountNumber: z.string(),
          accountHolderName: z.string(),
        })
      ),
      whatsappConfirmationUrl: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  whatsappPurchaseUrl: z.string().optional().nullable(),
});
export type CreatePublicPurchaseResponse = z.infer<typeof CreatePublicPurchaseResponseSchema>;

export const RejectPurchaseRequestSchema = z.object({
  reason: z.string().max(255).optional().nullable(),
});
export type RejectPurchaseRequest = z.infer<typeof RejectPurchaseRequestSchema>;

export const OrdersListResponseSchema = z.object({
  orders: z.array(ProgramPurchaseRequestSchema),
  total: z.number().int().nonnegative(),
});
export type OrdersListResponse = z.infer<typeof OrdersListResponseSchema>;


