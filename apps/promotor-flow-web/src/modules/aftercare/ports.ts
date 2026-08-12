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

export interface AftercareRepositoryPort {
  recordOutcome(contactId: string, outcome: AftercareOutcome, notes?: string): Promise<void>;
}
