import {
  FlowContact,
  FlowService,
  FlowBooking,
  FlowNextAction,
  FlowActivity,
  MessageTemplate,
  SEED_FLOW_CONTACTS,
  SEED_SERVICES,
  SEED_BOOKINGS,
  SEED_NEXT_ACTIONS,
  SEED_ACTIVITIES,
  SEED_TEMPLATES,
  SEED_TAGS,
} from '@promotor/promotor-flow-fixtures';
import { DemoScenarioPreset } from '@/modules/promotorclass/ports';

const STORAGE_KEY = 'promotorflow:m0:state:v1';

export interface PromotorFlowState {
  contacts: FlowContact[];
  services: FlowService[];
  bookings: FlowBooking[];
  nextActions: FlowNextAction[];
  activities: FlowActivity[];
  messageTemplates: MessageTemplate[];
  tags: string[];
  scenarioPreset: DemoScenarioPreset;
  isDevMode: boolean;
  promotorName: string;
  promotorPhoneE164: string;
  organizationName: string;
}

function getInitialState(): PromotorFlowState {
  return {
    contacts: JSON.parse(JSON.stringify(SEED_FLOW_CONTACTS)),
    services: JSON.parse(JSON.stringify(SEED_SERVICES)),
    bookings: JSON.parse(JSON.stringify(SEED_BOOKINGS)),
    nextActions: JSON.parse(JSON.stringify(SEED_NEXT_ACTIONS)),
    activities: JSON.parse(JSON.stringify(SEED_ACTIVITIES)),
    messageTemplates: JSON.parse(JSON.stringify(SEED_TEMPLATES)),
    tags: JSON.parse(JSON.stringify(SEED_TAGS)),
    scenarioPreset: 'BUNDLE_AVAILABLE',
    isDevMode: true,
    promotorName: 'Rina Maharani',
    promotorPhoneE164: '+6281234567890',
    organizationName: 'Rina Parenting & STIFIn Center',
  };
}

export class MockStateStore {
  private state: PromotorFlowState;
  private listeners: Array<() => void> = [];

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): PromotorFlowState {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getInitialState();
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getInitialState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.contacts) || !Array.isArray(parsed.nextActions)) {
        return getInitialState();
      }
      return parsed;
    } catch {
      return getInitialState();
    }
  }

  private saveState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.error('Failed to save MockStateStore to localStorage', e);
      }
    }
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  getState(): PromotorFlowState {
    return this.state;
  }

  resetDemo(): void {
    this.state = getInitialState();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    this.saveState();
  }

  // --- Contacts Mutations ---
  getContacts(): FlowContact[] {
    return this.state.contacts;
  }

  addContact(contact: FlowContact): void {
    this.state.contacts.unshift(contact);
    this.saveState();
  }

  updateContact(contactId: string, updates: Partial<FlowContact>): FlowContact {
    const idx = this.state.contacts.findIndex((c) => c.id === contactId);
    if (idx === -1) throw new Error(`Contact ${contactId} not found`);
    this.state.contacts[idx] = {
      ...this.state.contacts[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    return this.state.contacts[idx];
  }

  // --- Services Mutations ---
  getServices(): FlowService[] {
    return this.state.services;
  }

  addService(service: FlowService): void {
    this.state.services.push(service);
    this.saveState();
  }

  updateService(serviceId: string, updates: Partial<FlowService>): FlowService {
    const idx = this.state.services.findIndex((s) => s.id === serviceId);
    if (idx === -1) throw new Error(`Service ${serviceId} not found`);
    this.state.services[idx] = { ...this.state.services[idx], ...updates };
    this.saveState();
    return this.state.services[idx];
  }

  // --- Bookings Mutations ---
  getBookings(): FlowBooking[] {
    return this.state.bookings;
  }

  addBooking(booking: FlowBooking): void {
    this.state.bookings.unshift(booking);
    this.saveState();
  }

  updateBooking(bookingId: string, updates: Partial<FlowBooking>): FlowBooking {
    const idx = this.state.bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) throw new Error(`Booking ${bookingId} not found`);
    this.state.bookings[idx] = {
      ...this.state.bookings[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveState();
    return this.state.bookings[idx];
  }

  // --- NextActions Mutations ---
  getNextActions(): FlowNextAction[] {
    return this.state.nextActions;
  }

  addNextAction(action: FlowNextAction): void {
    this.state.nextActions.unshift(action);
    this.saveState();
  }

  updateNextAction(actionId: string, updates: Partial<FlowNextAction>): FlowNextAction {
    const idx = this.state.nextActions.findIndex((a) => a.id === actionId);
    if (idx === -1) throw new Error(`NextAction ${actionId} not found`);
    this.state.nextActions[idx] = { ...this.state.nextActions[idx], ...updates };
    this.saveState();
    return this.state.nextActions[idx];
  }

  cancelActiveActionsForContact(contactId: string, _reason: string): number {
    let count = 0;
    this.state.nextActions.forEach((a) => {
      if (a.contactId === contactId && a.status === 'PENDING') {
        a.status = 'CANCELLED';
        count++;
      }
    });
    if (count > 0) this.saveState();
    return count;
  }

  // --- Activities Mutations ---
  getActivities(): FlowActivity[] {
    return this.state.activities;
  }

  addActivity(activity: FlowActivity): void {
    this.state.activities.unshift(activity);
    this.saveState();
  }

  // --- Templates ---
  getMessageTemplates(): MessageTemplate[] {
    return this.state.messageTemplates;
  }

  // --- Scenario Preset ---
  getScenarioPreset(): DemoScenarioPreset {
    return this.state.scenarioPreset;
  }

  setScenarioPreset(preset: DemoScenarioPreset): void {
    this.state.scenarioPreset = preset;
    this.saveState();
  }

  // --- Settings ---
  updateSettings(updates: Partial<PromotorFlowState>): void {
    this.state = { ...this.state, ...updates };
    this.saveState();
  }
}

// Global Singleton for mock execution
export const mockStateStore = new MockStateStore();
