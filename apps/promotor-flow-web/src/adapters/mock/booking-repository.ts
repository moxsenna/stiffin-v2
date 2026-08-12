import { BookingRepositoryPort } from '@/modules/bookings/ports';
import { FlowBooking, BookingStatus } from '@promotor/promotor-flow-fixtures';
import { MockStateStore } from './mock-state-store';

export class MockBookingRepository implements BookingRepositoryPort {
  constructor(private store: MockStateStore) {}

  async listBookings(organizationId: string, status?: BookingStatus): Promise<FlowBooking[]> {
    let bookings = this.store.getBookings().filter((b) => b.organizationId === organizationId);
    if (status) {
      bookings = bookings.filter((b) => b.status === status);
    }
    return bookings;
  }

  async getContactBookings(organizationId: string, contactId: string): Promise<FlowBooking[]> {
    return this.store
      .getBookings()
      .filter((b) => b.organizationId === organizationId && b.contactId === contactId);
  }

  async getBookingDetail(organizationId: string, bookingId: string): Promise<FlowBooking | null> {
    const booking = this.store.getBookings().find((b) => b.organizationId === organizationId && b.id === bookingId);
    return booking || null;
  }

  async createBooking(bookingInput: Omit<FlowBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlowBooking> {
    const now = new Date().toISOString();
    const booking: FlowBooking = {
      ...bookingInput,
      id: `bk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
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
