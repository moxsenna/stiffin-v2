import { BookingRepositoryPort } from './ports';
import { FlowBooking } from '@promotor/promotor-flow-fixtures';

export function createBookingQueries(repo: BookingRepositoryPort) {
  return {
    async listBookings(organizationId: string): Promise<FlowBooking[]> {
      return repo.listBookings(organizationId);
    },

    async getContactBookings(organizationId: string, contactId: string): Promise<FlowBooking[]> {
      return repo.getContactBookings(organizationId, contactId);
    },

    async getBookingDetail(organizationId: string, bookingId: string): Promise<FlowBooking | null> {
      return repo.getBookingDetail(organizationId, bookingId);
    },

    async getCalendarAgenda(organizationId: string): Promise<FlowBooking[]> {
      const all = await repo.listBookings(organizationId);
      // Sort by startAt ascending
      return all.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    },
  };
}
