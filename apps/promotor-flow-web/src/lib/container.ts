import { mockStateStore } from '@/adapters/mock/mock-state-store';
import { mockClock } from '@/adapters/mock/mock-clock';

import { MockContactRepository } from '@/adapters/mock/contact-repository';
import { MockLifecycleRepository } from '@/adapters/mock/lifecycle-repository';
import { MockNextActionRepository } from '@/adapters/mock/next-action-repository';
import { MockBookingRepository } from '@/adapters/mock/booking-repository';
import { MockServiceRepository } from '@/adapters/mock/service-repository';
import { MockActivityRepository } from '@/adapters/mock/activity-repository';
import { MockMessageTemplateRepository } from '@/adapters/mock/message-template-repository';
import { MockAftercareRepository } from '@/adapters/mock/aftercare-repository';
import { MockSettingsRepository } from '@/adapters/mock/settings-repository';
import { MockPromotorClassAdapter } from '@/adapters/mock/promotorclass-adapter';

import { createContactQueries } from '@/modules/contacts/queries';
import { createContactCommands } from '@/modules/contacts/commands';

import { createLifecycleQueries } from '@/modules/lifecycle/queries';
import { createLifecycleCommands } from '@/modules/lifecycle/commands';

import { createNextActionQueries } from '@/modules/next-actions/queries';
import { createNextActionCommands } from '@/modules/next-actions/commands';

import { createBookingQueries } from '@/modules/bookings/queries';
import { createBookingCommands } from '@/modules/bookings/commands';

import { createServiceQueries } from '@/modules/services/queries';
import { createServiceCommands } from '@/modules/services/commands';

import { createActivityQueries } from '@/modules/activities/queries';
import { createActivityCommands } from '@/modules/activities/commands';

import { createMessagingQueries } from '@/modules/messaging/queries';
import { createMessagingCommands } from '@/modules/messaging/commands';

import { createAftercareQueries } from '@/modules/aftercare/queries';
import { createAftercareCommands } from '@/modules/aftercare/commands';

import { createSettingsQueries } from '@/modules/settings/queries';
import { createSettingsCommands } from '@/modules/settings/commands';

import { createPromotorClassQueries } from '@/modules/promotorclass/queries';
import { createPromotorClassCommands } from '@/modules/promotorclass/commands';

// Instantiation of concrete mock repositories
const contactRepo = new MockContactRepository(mockStateStore);
const lifecycleRepo = new MockLifecycleRepository(mockStateStore);
const nextActionRepo = new MockNextActionRepository(mockStateStore);
const bookingRepo = new MockBookingRepository(mockStateStore);
const serviceRepo = new MockServiceRepository(mockStateStore);
const activityRepo = new MockActivityRepository(mockStateStore);
const templateRepo = new MockMessageTemplateRepository(mockStateStore);
const aftercareRepo = new MockAftercareRepository(mockStateStore);
const settingsRepo = new MockSettingsRepository(mockStateStore);
const promotorClassAdapter = new MockPromotorClassAdapter(mockStateStore);

// Helper contact lookup for queries
const contactLookupFn = async (contactId: string) => {
  const c = await contactRepo.getContactDetail('org_rina_stifin', contactId);
  if (!c) return null;
  return { name: c.name, phoneE164: c.phoneE164, stage: c.stage, sourceChannel: c.sourceChannel };
};

// Export application domain services (queries & commands)
export const contactQueries = createContactQueries(contactRepo);
export const contactCommands = createContactCommands(contactRepo);

export const lifecycleQueries = createLifecycleQueries();
export const lifecycleCommands = createLifecycleCommands(lifecycleRepo, activityRepo);

export const nextActionQueries = createNextActionQueries(nextActionRepo, mockClock, contactLookupFn);
export const nextActionCommands = createNextActionCommands(nextActionRepo, activityRepo);

export const bookingQueries = createBookingQueries(bookingRepo);
export const bookingCommands = createBookingCommands(bookingRepo, lifecycleRepo, nextActionRepo, activityRepo, mockClock);

export const serviceQueries = createServiceQueries(serviceRepo);
export const serviceCommands = createServiceCommands(serviceRepo);

export const activityQueries = createActivityQueries(activityRepo);
export const activityCommands = createActivityCommands(activityRepo);

export const messagingQueries = createMessagingQueries(templateRepo);
export const messagingCommands = createMessagingCommands(nextActionRepo, activityRepo, mockClock);

export const aftercareQueries = createAftercareQueries();
export const aftercareCommands = createAftercareCommands(aftercareRepo, nextActionRepo, activityRepo, mockClock);

export const settingsQueries = createSettingsQueries(settingsRepo);
export const settingsCommands = createSettingsCommands(settingsRepo);

export const promotorClassQueries = createPromotorClassQueries(promotorClassAdapter);
export const promotorClassCommands = createPromotorClassCommands(promotorClassAdapter);

export const clock = mockClock;
export const store = mockStateStore;
