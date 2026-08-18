import { ApiClient, PromotorFlowApiClient } from '@promotor/api-client';
import { ContactRepositoryPort } from '@/modules/contacts/ports';
import { LifecycleRepositoryPort } from '@/modules/lifecycle/ports';
import { NextActionRepositoryPort } from '@/modules/next-actions/ports';
import { BookingRepositoryPort } from '@/modules/bookings/ports';
import { ServiceRepositoryPort } from '@/modules/services/ports';
import { ActivityRepositoryPort } from '@/modules/activities/ports';
import { MessageTemplateRepositoryPort } from '@/modules/messaging/ports';
import { AftercareRepositoryPort } from '@/modules/aftercare/ports';
import { SettingsRepositoryPort } from '@/modules/settings/ports';
import { PromotorClassAdapterPort } from '@/modules/promotorclass/ports';

import { MockContactRepository } from './mock/contact-repository';
import { MockLifecycleRepository } from './mock/lifecycle-repository';
import { MockNextActionRepository } from './mock/next-action-repository';
import { MockBookingRepository } from './mock/booking-repository';
import { MockServiceRepository } from './mock/service-repository';
import { MockActivityRepository } from './mock/activity-repository';
import { MockMessageTemplateRepository } from './mock/message-template-repository';
import { MockAftercareRepository } from './mock/aftercare-repository';
import { MockSettingsRepository } from './mock/settings-repository';
import { MockPromotorClassAdapter } from './mock/promotorclass-adapter';
import { mockStateStore } from './mock/mock-state-store';

import { HttpContactRepository } from './http/contact-repository';
import { HttpLifecycleRepository } from './http/lifecycle-repository';
import { HttpNextActionRepository } from './http/next-action-repository';
import { HttpBookingRepository } from './http/booking-repository';
import { HttpServiceRepository } from './http/service-repository';
import { HttpActivityRepository } from './http/activity-repository';
import { HttpMessageTemplateRepository } from './http/message-template-repository';
import { HttpAftercareRepository } from './http/aftercare-repository';
import { HttpSettingsRepository } from './http/settings-repository';
import { HttpPromotorClassAdapter } from './http/promotorclass-adapter';

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

function getApiClient(): PromotorFlowApiClient {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
  const client = new ApiClient({
    baseUrl,
    credentials: 'include',
  });
  return new PromotorFlowApiClient(client);
}

let contactRepoInstance: ContactRepositoryPort | null = null;
let lifecycleRepoInstance: LifecycleRepositoryPort | null = null;
let nextActionRepoInstance: NextActionRepositoryPort | null = null;
let bookingRepoInstance: BookingRepositoryPort | null = null;
let serviceRepoInstance: ServiceRepositoryPort | null = null;
let activityRepoInstance: ActivityRepositoryPort | null = null;
let messageTemplateRepoInstance: MessageTemplateRepositoryPort | null = null;
let aftercareRepoInstance: AftercareRepositoryPort | null = null;
let settingsRepoInstance: SettingsRepositoryPort | null = null;
let promotorClassAdapterInstance: PromotorClassAdapterPort | null = null;

export function getContactRepository(): ContactRepositoryPort {
  if (!contactRepoInstance) {
    contactRepoInstance =
      getApiMode() === 'http'
        ? new HttpContactRepository(getApiClient())
        : new MockContactRepository(mockStateStore);
  }
  return contactRepoInstance;
}

export function getLifecycleRepository(): LifecycleRepositoryPort {
  if (!lifecycleRepoInstance) {
    lifecycleRepoInstance =
      getApiMode() === 'http'
        ? new HttpLifecycleRepository(getApiClient())
        : new MockLifecycleRepository(mockStateStore);
  }
  return lifecycleRepoInstance;
}

export function getNextActionRepository(): NextActionRepositoryPort {
  if (!nextActionRepoInstance) {
    nextActionRepoInstance =
      getApiMode() === 'http'
        ? new HttpNextActionRepository(getApiClient())
        : new MockNextActionRepository(mockStateStore);
  }
  return nextActionRepoInstance;
}

export function getBookingRepository(): BookingRepositoryPort {
  if (!bookingRepoInstance) {
    bookingRepoInstance =
      getApiMode() === 'http'
        ? new HttpBookingRepository(getApiClient())
        : new MockBookingRepository(mockStateStore);
  }
  return bookingRepoInstance;
}

export function getServiceRepository(): ServiceRepositoryPort {
  if (!serviceRepoInstance) {
    serviceRepoInstance =
      getApiMode() === 'http'
        ? new HttpServiceRepository(getApiClient())
        : new MockServiceRepository(mockStateStore);
  }
  return serviceRepoInstance;
}

export function getActivityRepository(): ActivityRepositoryPort {
  if (!activityRepoInstance) {
    activityRepoInstance =
      getApiMode() === 'http'
        ? new HttpActivityRepository(getApiClient())
        : new MockActivityRepository(mockStateStore);
  }
  return activityRepoInstance;
}

export function getMessageTemplateRepository(): MessageTemplateRepositoryPort {
  if (!messageTemplateRepoInstance) {
    messageTemplateRepoInstance =
      getApiMode() === 'http'
        ? new HttpMessageTemplateRepository(getApiClient())
        : new MockMessageTemplateRepository(mockStateStore);
  }
  return messageTemplateRepoInstance;
}

export function getAftercareRepository(): AftercareRepositoryPort {
  if (!aftercareRepoInstance) {
    aftercareRepoInstance =
      getApiMode() === 'http'
        ? new HttpAftercareRepository(getApiClient())
        : new MockAftercareRepository(mockStateStore);
  }
  return aftercareRepoInstance;
}

export function getSettingsRepository(): SettingsRepositoryPort {
  if (!settingsRepoInstance) {
    settingsRepoInstance =
      getApiMode() === 'http'
        ? new HttpSettingsRepository(getApiClient())
        : new MockSettingsRepository(mockStateStore);
  }
  return settingsRepoInstance;
}

export function getPromotorClassAdapter(): PromotorClassAdapterPort {
  if (!promotorClassAdapterInstance) {
    promotorClassAdapterInstance =
      getApiMode() === 'http'
        ? new HttpPromotorClassAdapter(getApiClient())
        : new MockPromotorClassAdapter(mockStateStore);
  }
  return promotorClassAdapterInstance;
}

export function resetAdapterInstances(): void {
  contactRepoInstance = null;
  lifecycleRepoInstance = null;
  nextActionRepoInstance = null;
  bookingRepoInstance = null;
  serviceRepoInstance = null;
  activityRepoInstance = null;
  messageTemplateRepoInstance = null;
  aftercareRepoInstance = null;
  settingsRepoInstance = null;
  promotorClassAdapterInstance = null;
}
