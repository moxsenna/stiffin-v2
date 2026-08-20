import { PromotorApiClient } from '@promotor/api-client';
import { LearningSignal } from '@promotor/contracts';
import { SignalRepositoryPort } from '@/modules/signals/ports';

export class HttpSignalRepository implements SignalRepositoryPort {
  constructor(private readonly client: PromotorApiClient) {}

  async getSignals(): Promise<LearningSignal[]> {
    const res = await this.client.listClassSignals();
    return (res.signals || []).map((s: any) => {
      const intentLabel = (s.intentLabel || '').toUpperCase();
      const signalLevel =
        s.signalLevel ||
        (intentLabel === 'HOT'
          ? 'Minat tinggi'
          : intentLabel === 'WARM'
          ? 'Minat sedang'
          : 'Minat rendah');

      const intentScore =
        typeof s.intentScore === 'number'
          ? s.intentScore
          : intentLabel === 'HOT'
          ? 80
          : intentLabel === 'WARM'
          ? 40
          : 10;

      return {
        id: s.id,
        organizationId: s.organizationId,
        contactId: s.contactId,
        programId: s.programId || s.enrollmentId,
        enrollmentId: s.enrollmentId,
        sourceEventId: s.sourceEventId || undefined,
        signalLevel,
        intentScore,
        primaryReason: s.primaryReason || s.recommendedActionReason || s.reason || 'Aktivitas belajar terdeteksi',
        rawReflectionQuote: s.rawReflectionQuote || undefined,
        status: s.status,
        evaluatedAt: s.evaluatedAt || s.createdAt,
      };
    });
  }

  async getSignalById(id: string): Promise<LearningSignal | undefined> {
    const signals = await this.getSignals();
    return signals.find((s) => s.id === id);
  }

  async getSignalByContactId(contactId: string): Promise<LearningSignal | undefined> {
    const signals = await this.getSignals();
    return signals.find((s) => s.contactId === contactId);
  }

  async reevaluateSignal(contactId: string, enrollmentId: string): Promise<LearningSignal> {
    const signals = await this.getSignals();
    const existing = signals.find((s) => s.contactId === contactId && s.enrollmentId === enrollmentId);
    if (existing) return existing;
    throw new Error(`Sinyal belajar untuk kontak ${contactId} tidak ditemukan`);
  }
}
