import { FlowBooking, BookingStatus, PaymentStatus } from '@promotor/promotor-flow-fixtures';

export interface BookingRepositoryPort {
  listBookings(organizationId: string, status?: BookingStatus): Promise<FlowBooking[]>;
  getContactBookings(organizationId: string, contactId: string): Promise<FlowBooking[]>;
  getBookingDetail(organizationId: string, bookingId: string): Promise<FlowBooking | null>;
  createBooking(booking: Omit<FlowBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlowBooking>;
  updateBooking(bookingId: string, updates: Partial<FlowBooking>): Promise<FlowBooking>;
}
