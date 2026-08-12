import { Program } from '@promotor/contracts';

export interface PublicWorkspaceProfile {
  workspaceSlug: string;
  displayName: string;
  tagline: string;
  headline: string;
  bio: string;
  city: string;
  roleLabel: string;
  heroProgramId: string;
  whatsappPhoneE164?: string;
  stats: {
    familiesHelped?: string;
    programCount: string;
    location: string;
  };
}

export interface LearningOutcome {
  title: string;
  description: string;
}

export interface ProgramPublicPresentation {
  coverVariant: 'cover-a' | 'cover-b' | 'cover-c';
  featured: boolean;
  heroEyebrow: string;
  shortOutcome: string;
  durationLabel: string;
  learningOutcomes: LearningOutcome[];
}

export interface PublicProgramCatalogItem {
  program: Program;
  presentation: ProgramPublicPresentation;
  isRegistrationAllowed: boolean;
  registrationStatusNotice?: string;
}

export interface PublicProgramDetail {
  program: Program;
  presentation: ProgramPublicPresentation;
  promoter: PublicWorkspaceProfile;
  isRegistrationAllowed: boolean;
  registrationStatusNotice?: string;
}
