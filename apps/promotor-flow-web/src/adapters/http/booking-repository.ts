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
    let serviceId = booking.serviceId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId)) {
      try {
        const servicesRes = await this.api.listServices();
        const match = (servicesRes.services || []).find((s: any) => s.isActive);
        if (match) {
          serviceId = match.id;
        } else {
          const createdSrv = await this.api.createService({
            name: booking.serviceTitle || 'Tes STIFIn Personal',
            category: 'ASSESSMENT',
            priceAmount: booking.amount || 600000,
            durationMinutes: 60,
            isActive: true,
          });
          serviceId = createdSrv.service?.id || (createdSrv as any).id;
        }
      } catch (err) {
        console.error('Failed to resolve or create service for booking:', err);
      }
    }

    const endAt =
      booking.endAt && new Date(booking.endAt).getTime() > new Date(booking.startAt).getTime()
        ? booking.endAt
        : new Date(new Date(booking.startAt).getTime() + 60 * 60 * 1000).toISOString();

    const res = await this.api.createBooking({
      contactId: booking.contactId,
      serviceId,
      startAt: booking.startAt,
      endAt,
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
