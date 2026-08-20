import { PromotorApiClient } from '@promotor/api-client';
import { LearningSignal } from '@promotor/contracts';
import { SignalRepositoryPort } from '@/modules/signals/ports';

export class HttpSignalRepository implements SignalRepositoryPort {
  constructor(private readonly client: PromotorApiClient) {}

  async getSignals(): Promise<LearningSignal[]> {
    const res = await this.client.listClassSignals();
    return (res.signals || []).map((s: any) => ({
      id: s.id,
      organizationId: s.organizationId,
      contactId: s.contactId,
      programId: s.metadata?.programId || s.enrollmentId,
      enrollmentId: s.enrollmentId,
      sourceEventId: s.metadata?.sourceEventId,
      signalLevel: (s.metadata?.intentLabel === 'HOT' || s.reason?.toLowerCase().includes('tinggi'))
        ? 'Minat tinggi'
        : (s.metadata?.intentLabel === 'WARM' || s.reason?.toLowerCase().includes('sedang'))
        ? 'Minat sedang'
        : 'Minat rendah',
      intentScore: s.metadata?.intentScore ?? 50,
      primaryReason: s.reason || 'Aktivitas belajar terdeteksi',
      rawReflectionQuote: s.metadata?.rawReflectionQuote,
      status: s.status,
      evaluatedAt: s.createdAt,
    }));
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
    return {
      id: crypto.randomUUID(),
      organizationId: '',
      contactId,
      enrollmentId,
      signalLevel: 'Minat sedang',
      intentScore: 50,
      primaryReason: 'Evaluasi sinyal',
      status: 'ACTIVE',
      evaluatedAt: new Date().toISOString(),
    };
  }
}
