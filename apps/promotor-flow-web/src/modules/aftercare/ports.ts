export type AftercareOutcome =
  | 'NO_FURTHER_NEED'
  | 'HAS_QUESTION'
  | 'NEEDS_FOLLOW_ON_SESSION'
  | 'CONTACT_LATER';

export interface AftercareOutcomeOption {
  outcome: AftercareOutcome;
  label: string;
  description: string;
}

export interface CompleteAftercareInput {
  actionId: string;
  outcome: AftercareOutcome;
  notes?: string;
  contactId?: string;
  organizationId?: string;
}

export interface AftercareRepositoryPort {
  completeAftercare(input: CompleteAftercareInput): Promise<void>;
}
