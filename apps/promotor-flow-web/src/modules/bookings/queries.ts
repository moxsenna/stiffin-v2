import { BookingRepositoryPort } from './ports';
import { FlowBooking, BookingStatus } from '@promotor/promotor-flow-fixtures';

export function createBookingQueries(repo: BookingRepositoryPort) {
  return {
    async listBookings(status?: BookingStatus, organizationId?: string): Promise<FlowBooking[]> {
      return repo.listBookings(status, organizationId);
    },

    async getContactBookings(contactId: string, organizationId?: string): Promise<FlowBooking[]> {
      return repo.getContactBookings(contactId, organizationId);
    },

    async getBookingDetail(bookingId: string, organizationId?: string): Promise<FlowBooking | null> {
      return repo.getBookingDetail(bookingId, organizationId);
    },

    async getCalendarAgenda(organizationId?: string): Promise<FlowBooking[]> {
      const all = await repo.listBookings(undefined, organizationId);
      // Sort by startAt ascending
      return all.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    },
  };
}
