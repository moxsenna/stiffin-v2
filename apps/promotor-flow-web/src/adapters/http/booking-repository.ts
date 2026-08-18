import { BookingRepositoryPort } from '@/modules/bookings/ports';
import { FlowBooking, BookingStatus, PaymentStatus } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient, ApiError } from '@promotor/api-client';

export class HttpBookingRepository implements BookingRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listBookings(status?: BookingStatus, _organizationId?: string): Promise<FlowBooking[]> {
    const res = await this.api.listBookings({ status });
    return (res.bookings || []).map((b: any) => this.mapToFlowBooking(b));
  }

  async getContactBookings(contactId: string, _organizationId?: string): Promise<FlowBooking[]> {
    const res = await this.api.listBookings({ contactId });
    return (res.bookings || []).map((b: any) => this.mapToFlowBooking(b));
  }

  async getBookingDetail(bookingId: string, _organizationId?: string): Promise<FlowBooking | null> {
    try {
      const res = await this.api.getBooking(bookingId);
      return this.mapToFlowBooking(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }

  async createBooking(booking: Omit<FlowBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<FlowBooking> {
    const res = await this.api.createBooking({
      contactId: booking.contactId,
      serviceId: booking.serviceId,
      startAt: booking.startAt,
      endAt: booking.endAt,
      locationType: booking.locationType as any,
      notes: booking.notes,
    });
    return this.mapToFlowBooking(res.booking);
  }

  async updateBooking(bookingId: string, updates: Partial<FlowBooking>): Promise<FlowBooking> {
    if (updates.status === 'CONFIRMED') {
      const res = await this.api.confirmBooking(bookingId);
      return this.mapToFlowBooking(res.booking);
    }
    if (updates.status === 'COMPLETED') {
      const res = await this.api.completeBooking(bookingId);
      return this.mapToFlowBooking(res.booking);
    }
    if (updates.status === 'CANCELLED') {
      const res = await this.api.cancelBooking(bookingId, { cancellationReason: updates.notes || 'Cancelled by operator' });
      return this.mapToFlowBooking(res.booking);
    }
    if (updates.status === 'NO_SHOW') {
      const res = await this.api.noShowBooking(bookingId);
      return this.mapToFlowBooking(res.booking);
    }
    if (updates.paymentStatus === 'PAID') {
      const res = await this.api.markBookingPaid(bookingId);
      return this.mapToFlowBooking(res.booking);
    }
    if (updates.startAt) {
      const res = await this.api.rescheduleBooking(bookingId, {
        startAt: updates.startAt,
        endAt: updates.endAt,
      });
      return this.mapToFlowBooking(res.booking);
    }

    const current = await this.getBookingDetail(bookingId);
    return current || ({} as FlowBooking);
  }

  private mapToFlowBooking(b: any): FlowBooking {
    return {
      id: b.id,
      organizationId: b.organizationId,
      contactId: b.contactId,
      serviceId: b.serviceId,
      serviceTitle: b.serviceTitle ?? 'Sesi Konsultasi',
      startAt: b.startAt,
      endAt: b.endAt ?? b.startAt,
      locationType: b.locationType ?? 'ONLINE',
      status: b.status as BookingStatus,
      paymentStatus: (b.paymentStatus || 'UNPAID') as PaymentStatus,
      amount: b.amount ?? 0,
      notes: b.notes ?? undefined,
      createdAt: b.createdAt ?? new Date().toISOString(),
      updatedAt: b.updatedAt ?? new Date().toISOString(),
    };
  }
}
