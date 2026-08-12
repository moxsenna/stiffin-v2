import { LearningSignal } from '@promotor/contracts';

export interface SignalRepositoryPort {
  getSignals(): Promise<LearningSignal[]>;
  getSignalById(id: string): Promise<LearningSignal | undefined>;
  getSignalByContactId(contactId: string): Promise<LearningSignal | undefined>;
  reevaluateSignal(contactId: string, enrollmentId: string): Promise<LearningSignal>;
}
