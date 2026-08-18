import { BookingRepositoryPort } from '@/modules/bookings/ports';
import { FlowBooking, BookingStatus, PaymentStatus } from '@promotor/promotor-flow-fixtures';
import { PromotorFlowApiClient, ApiError } from '@promotor/api-client';

export class HttpBookingRepository implements BookingRepositoryPort {
  constructor(private api: PromotorFlowApiClient) {}

  async listBookings(_organizationId: string, status?: BookingStatus): Promise<FlowBooking[]> {
    const res = await this.api.listBookings({ status: status as any });
    return (res.bookings || []).map((b: any) => this.mapToFlowBooking(b));
  }

  async getContactBookings(_organizationId: string, contactId: string): Promise<FlowBooking[]> {
    const res = await this.api.listBookings({ contactId });
    return (res.bookings || []).map((b: any) => this.mapToFlowBooking(b));
  }

  async getBookingDetail(_organizationId: string, bookingId: string): Promise<FlowBooking | null> {
    try {
      const res = await this.api.getBooking(bookingId);
      return this.mapToFlowBooking(res.booking);
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
      locationText: booking.locationAddress,
      notes: booking.notes,
      idempotencyKey: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
      const res = await this.api.cancelBooking(bookingId, { cancellationReason: updates.notes });
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
      const res = await this.api.rescheduleBooking(bookingId, { startAt: updates.startAt, endAt: updates.endAt });
      return this.mapToFlowBooking(res.booking);
    }
    const res = await this.api.getBooking(bookingId);
    return this.mapToFlowBooking(res.booking);
  }

  private mapToFlowBooking(b: any): FlowBooking {
    return {
      id: b.id,
      organizationId: b.organizationId,
      contactId: b.contactId,
      serviceId: b.serviceId,
      serviceTitle: b.service?.name ?? b.serviceTitle ?? 'Session',
      startAt: b.startAt,
      endAt: b.endAt ?? new Date(new Date(b.startAt).getTime() + 3600_000).toISOString(),
      locationType: (b.locationType || 'ONLINE') as 'HOME_VISIT' | 'ON_SITE' | 'ONLINE',
      locationAddress: b.locationText ?? b.locationAddress ?? undefined,
      status: b.status as BookingStatus,
      paymentStatus: (b.paymentStatus || 'UNPAID') as PaymentStatus,
      amount: b.amount ?? 0,
      notes: b.notes ?? undefined,
      createdAt: b.createdAt ?? new Date().toISOString(),
      updatedAt: b.updatedAt ?? new Date().toISOString(),
    };
  }
}
