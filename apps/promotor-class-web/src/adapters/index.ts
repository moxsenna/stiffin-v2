import { ApiClient, PromotorClassContentApiClient } from '@promotor/api-client';
import {
  IntegrationEventEnvelope,
  FlowNextActionRef,
  IntegrationHealth,
} from '@promotor/contracts';
import { ProgramRepositoryPort } from '@/modules/programs/ports';
import { PublicStorefrontRepositoryPort } from '@/modules/public-storefront/ports';
import { EnrollmentRepositoryPort } from '@/modules/enrollments/ports';
import { LearningRepositoryPort } from '@/modules/learning/ports';
import { ContactRepositoryPort } from '@/modules/contacts/ports';
import { ReflectionRepositoryPort } from '@/modules/reflections/ports';
import { SignalRepositoryPort } from '@/modules/signals/ports';
import { EventRepositoryPort } from '@/modules/events/ports';
import { PromotorFlowAdapterPort } from '@/modules/promotorflow/ports';
import { ReferralRepositoryPort } from '@/modules/referrals/ports';

import { MockProgramRepository } from './mock/program-repository';
import { MockPublicStorefrontRepository } from './mock/public-storefront-repository';
import { MockEnrollmentRepository } from './mock/enrollment-repository';
import { MockLearningRepository } from './mock/learning-repository';
import { contactRepository as mockContactRepository } from './mock/contact-repository';
import { MockReflectionRepository } from './mock/reflection-repository';
import { MockSignalRepository } from './mock/signal-repository';
import { MockEventRepository } from './mock/event-repository';
import { promotorFlowAdapter as mockPromotorFlowAdapter } from './mock/promotorflow-adapter';
import { mockReferralRepository } from './mock/referral-repository';

import { HttpProgramRepository } from './http/program-repository';
import { HttpPublicStorefrontRepository } from './http/public-storefront-repository';
import { HttpEnrollmentRepository } from './http/enrollment-repository';
import { HttpLearningRepository } from './http/learning-repository';
import { HttpContactRepository } from './http/contact-repository';
import { HttpReflectionRepository } from './http/reflection-repository';
import { HttpSignalRepository } from './http/signal-repository';
import { HttpEventRepository } from './http/event-repository';

let programRepoInstance: ProgramRepositoryPort | null = null;
let storefrontRepoInstance: PublicStorefrontRepositoryPort | null = null;
let enrollmentRepoInstance: EnrollmentRepositoryPort | null = null;
let learningRepoInstance: LearningRepositoryPort | null = null;
let contactRepoInstance: ContactRepositoryPort | null = null;
let reflectionRepoInstance: ReflectionRepositoryPort | null = null;
let signalRepoInstance: SignalRepositoryPort | null = null;
let eventRepoInstance: EventRepositoryPort | null = null;
let flowAdapterInstance: PromotorFlowAdapterPort | null = null;

export function getApiMode(): 'http' | 'mock' {
  const mode = process.env.NEXT_PUBLIC_API_MODE;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (mode !== 'http') {
      throw new Error(
        '[Adapter Factory] Production environment requires NEXT_PUBLIC_API_MODE="http". Mock mode is strictly forbidden in production.'
      );
    }
    return 'http';
  }

  return mode === 'http' ? 'http' : 'mock';
}

export function getPlatformApiClient(): PromotorClassContentApiClient {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  const rawClient = new ApiClient({
    baseUrl,
    authToken: () => {
      if (typeof window !== 'undefined') {
        if (window.location.pathname.startsWith('/learn')) {
          return undefined;
        }
        return localStorage.getItem('promotor_session_token') || undefined;
      }
      return undefined;
    },
    credentials: 'include',
  });
  return new PromotorClassContentApiClient(rawClient);
}

function getApiClient(): PromotorClassContentApiClient {
  return getPlatformApiClient();
}

export function getProgramRepository(): ProgramRepositoryPort {
  if (!programRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      programRepoInstance = new HttpProgramRepository(getApiClient());
    } else {
      programRepoInstance = new MockProgramRepository();
    }
  }
  return programRepoInstance;
}

export function getPublicStorefrontRepository(): PublicStorefrontRepositoryPort {
  if (!storefrontRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      storefrontRepoInstance = new HttpPublicStorefrontRepository(getApiClient());
    } else {
      storefrontRepoInstance = new MockPublicStorefrontRepository();
    }
  }
  return storefrontRepoInstance;
}

export function getEnrollmentRepository(): EnrollmentRepositoryPort {
  if (!enrollmentRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      enrollmentRepoInstance = new HttpEnrollmentRepository(getApiClient());
    } else {
      enrollmentRepoInstance = new MockEnrollmentRepository();
    }
  }
  return enrollmentRepoInstance;
}

export function getLearningRepository(): LearningRepositoryPort {
  if (!learningRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      learningRepoInstance = new HttpLearningRepository(getApiClient());
    } else {
      learningRepoInstance = new MockLearningRepository();
    }
  }
  return learningRepoInstance;
}

export function getContactRepository(): ContactRepositoryPort {
  if (!contactRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      contactRepoInstance = new HttpContactRepository(getApiClient());
    } else {
      contactRepoInstance = mockContactRepository;
    }
  }
  return contactRepoInstance;
}

export function getReflectionRepository(): ReflectionRepositoryPort {
  if (!reflectionRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      reflectionRepoInstance = new HttpReflectionRepository(getApiClient());
    } else {
      reflectionRepoInstance = new MockReflectionRepository();
    }
  }
  return reflectionRepoInstance;
}

export function getSignalRepository(): SignalRepositoryPort {
  if (!signalRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      signalRepoInstance = new HttpSignalRepository(getApiClient());
    } else {
      signalRepoInstance = new MockSignalRepository();
    }
  }
  return signalRepoInstance;
}

export function getEventRepository(): EventRepositoryPort {
  if (!eventRepoInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      eventRepoInstance = new HttpEventRepository(getApiClient());
    } else {
      eventRepoInstance = new MockEventRepository();
    }
  }
  return eventRepoInstance;
}

export class HttpPromotorFlowAdapter implements PromotorFlowAdapterPort {
  constructor(private readonly client: PromotorClassContentApiClient) {}

  async getIntegrationHealth(): Promise<IntegrationHealth> {
    return this.client.getIntegrationHealth();
  }

  async dispatchOutboxEnvelope(_envelope: IntegrationEventEnvelope): Promise<FlowNextActionRef | null> {
    // In HTTP mode, Class ↔ Flow outbox is dispatched automatically by the Platform API backend
    return null;
  }
}

export function getPromotorFlowAdapter(): PromotorFlowAdapterPort {
  if (!flowAdapterInstance) {
    const mode = getApiMode();
    if (mode === 'http') {
      flowAdapterInstance = new HttpPromotorFlowAdapter(getApiClient());
    } else {
      flowAdapterInstance = mockPromotorFlowAdapter;
    }
  }
  return flowAdapterInstance;
}

export function getReferralRepository(): ReferralRepositoryPort {
  return mockReferralRepository;
}

export function resetAdapterInstances(): void {
  programRepoInstance = null;
  storefrontRepoInstance = null;
  enrollmentRepoInstance = null;
  learningRepoInstance = null;
  contactRepoInstance = null;
  reflectionRepoInstance = null;
  signalRepoInstance = null;
  eventRepoInstance = null;
  flowAdapterInstance = null;
}

export async function resetDemoState(): Promise<void> {
  const mode = getApiMode();
  if (mode === 'mock') {
    const { MockStateStore } = await import('./mock/mock-state-store');
    MockStateStore.resetDemo();
  }
}


