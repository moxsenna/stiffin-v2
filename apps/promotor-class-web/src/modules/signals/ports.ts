import { LearningSignal } from '@promotor/contracts';

export interface SignalPort {
  getSignals(): Promise<LearningSignal[]>;
  getSignalForContact(contactId: string): Promise<LearningSignal | undefined>;
  createOrUpdateSignal(signal: Omit<LearningSignal, 'id' | 'createdAt'>): Promise<LearningSignal>;
}
