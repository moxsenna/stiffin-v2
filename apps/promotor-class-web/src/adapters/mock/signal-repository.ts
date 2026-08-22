import { LearningSignal } from '@promotor/contracts';
import { SignalRepositoryPort } from '@/modules/signals/ports';
import { MockStateStore } from './mock-state-store';

export class MockSignalRepository implements SignalRepositoryPort {
  async getSignals(): Promise<LearningSignal[]> {
    return MockStateStore.getState().learningSignals;
  }

  async getSignalById(id: string): Promise<LearningSignal | undefined> {
    return MockStateStore.getState().learningSignals.find((s) => s.id === id);
  }

  async getSignalByContactId(contactId: string): Promise<LearningSignal | undefined> {
    return MockStateStore.getState().learningSignals.find((s) => s.contactId === contactId);
  }

  async reevaluateSignal(contactId: string, enrollmentId: string): Promise<LearningSignal> {
    const signal = MockStateStore.getState().learningSignals.find(
      (s) => s.contactId === contactId && s.enrollmentId === enrollmentId
    );
    if (signal) return signal;
    const newSignal: LearningSignal = {
      id: `sig-${Date.now()}`,
      organizationId: 'org-demo',
      contactId,
      enrollmentId,
      signalLevel: 'Minat sedang',
      intentScore: 50,
      primaryReason: 'Evaluasi sinyal',
      status: 'ACTIVE',
      evaluatedAt: new Date().toISOString(),
    };
    MockStateStore.updateState((s) => ({
      ...s,
      learningSignals: [...s.learningSignals, newSignal],
    }));
    return newSignal;
  }
}
