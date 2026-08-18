import { FlowBooking, BookingStatus } from '@promotor/promotor-flow-fixtures';

export interface BookingRepositoryPort {
  listBookings(status?: BookingStatus, organizationId?: string): Promise<FlowBooking[]>;
  getContactBookings(contactId: string, organizationId?: string): Promise<FlowBooking[]>;
  getBookingDetail(bookingId: string, organizationId?: string): Promise<FlowBooking | null>;
  createBooking(booking: Omit<FlowBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlowBooking>;
  updateBooking(bookingId: string, updates: Partial<FlowBooking>): Promise<FlowBooking>;
}
