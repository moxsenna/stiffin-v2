import {
  getContactRepository,
  getLifecycleRepository,
  getNextActionRepository,
  getBookingRepository,
  getServiceRepository,
  getActivityRepository,
  getMessageTemplateRepository,
  getAftercareRepository,
  getMessagingRepository,
  getSettingsRepository,
  getPromotorClassAdapter,
  getAvailabilityRepository,
  getClock,
} from '@/adapters';

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

import { createAvailabilityQueries } from '@/modules/availability/queries';
import { createAvailabilityCommands } from '@/modules/availability/commands';

// Active repositories resolved via environment-controlled adapter factory
const contactRepo = getContactRepository();
const lifecycleRepo = getLifecycleRepository();
const nextActionRepo = getNextActionRepository();
const bookingRepo = getBookingRepository();
const serviceRepo = getServiceRepository();
const activityRepo = getActivityRepository();
const templateRepo = getMessageTemplateRepository();
const aftercareRepo = getAftercareRepository();
const messagingRepo = getMessagingRepository();
const settingsRepo = getSettingsRepository();
const promotorClassAdapter = getPromotorClassAdapter();
const availabilityRepo = getAvailabilityRepository();
const activeClock = getClock();

// Helper contact lookup for queries
const contactLookupFn = async (contactId: string) => {
  const c = await contactRepo.getContactDetail(contactId);
  if (!c) return null;
  return { name: c.name, phoneE164: c.phoneE164, stage: c.stage, sourceChannel: c.sourceChannel };
};

// Export application domain services (queries & commands)
export const contactQueries = createContactQueries(contactRepo);
export const contactCommands = createContactCommands(contactRepo);

export const lifecycleQueries = createLifecycleQueries();
export const lifecycleCommands = createLifecycleCommands(lifecycleRepo, activityRepo);

export const nextActionQueries = createNextActionQueries(nextActionRepo, activeClock, contactLookupFn);
export const nextActionCommands = createNextActionCommands(nextActionRepo, activityRepo);

export const bookingQueries = createBookingQueries(bookingRepo);
export const bookingCommands = createBookingCommands(bookingRepo, lifecycleRepo, nextActionRepo, activityRepo, activeClock);

export const serviceQueries = createServiceQueries(serviceRepo);
export const serviceCommands = createServiceCommands(serviceRepo);

export const activityQueries = createActivityQueries(activityRepo);
export const activityCommands = createActivityCommands(activityRepo);

export const messagingQueries = createMessagingQueries(templateRepo);
export const messagingCommands = createMessagingCommands(messagingRepo);

export const aftercareQueries = createAftercareQueries();
export const aftercareCommands = createAftercareCommands(aftercareRepo, nextActionRepo, activityRepo, activeClock);

export const settingsQueries = createSettingsQueries(settingsRepo);
export const settingsCommands = createSettingsCommands(settingsRepo);

export const promotorClassQueries = createPromotorClassQueries(promotorClassAdapter);
export const promotorClassCommands = createPromotorClassCommands(promotorClassAdapter);

export const availabilityQueries = createAvailabilityQueries(availabilityRepo);
export const availabilityCommands = createAvailabilityCommands(availabilityRepo);

export const clock = activeClock;


