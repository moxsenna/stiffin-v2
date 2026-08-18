import { BookingRepositoryPort } from '@/modules/bookings/ports';
import { FlowBooking, BookingStatus } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockBookingRepository implements BookingRepositoryPort {
  constructor(private store: MockStateStore) {}

  private resolveOrgId(organizationId?: string): string {
    return organizationId || 'org_rina_stifin';
  }

  async listBookings(status?: BookingStatus, organizationId?: string): Promise<FlowBooking[]> {
    const orgId = this.resolveOrgId(organizationId);
    let bookings = this.store.getBookings().filter((b) => b.organizationId === orgId);
    if (status) {
      bookings = bookings.filter((b) => b.status === status);
    }
    return bookings;
  }

  async getContactBookings(contactId: string, organizationId?: string): Promise<FlowBooking[]> {
    const orgId = this.resolveOrgId(organizationId);
    return this.store
      .getBookings()
      .filter((b) => b.organizationId === orgId && b.contactId === contactId);
  }

  async getBookingDetail(bookingId: string, organizationId?: string): Promise<FlowBooking | null> {
    const orgId = this.resolveOrgId(organizationId);
    const booking = this.store.getBookings().find((b) => b.organizationId === orgId && b.id === bookingId);
    return booking || null;
  }

  async createBooking(bookingInput: Omit<FlowBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlowBooking> {
    const now = new Date().toISOString();
    const orgId = this.resolveOrgId(bookingInput.organizationId);
    const booking: FlowBooking = {
      ...bookingInput,
      organizationId: orgId,
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.store.addBooking(booking);
    return booking;
  }

  async updateBooking(bookingId: string, updates: Partial<FlowBooking>): Promise<FlowBooking> {
    return this.store.updateBooking(bookingId, updates);
  }
}
