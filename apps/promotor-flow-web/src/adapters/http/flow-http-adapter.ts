/**
 * HTTP Adapter Seam for PromotorFlow Backend.
 *
 * This file serves as the architectural seam for future backend integration.
 * In V0.1, the Mock Adapter is used for all stateful domain operations.
 */

import { ContactRepositoryPort } from '@/modules/contacts/ports';
import { NextActionRepositoryPort } from '@/modules/next-actions/ports';
import { BookingRepositoryPort } from '@/modules/bookings/ports';

export class HttpContactRepository implements ContactRepositoryPort {
  async listContacts(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async getContactDetail(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async findContactByPhone(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async createContact(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async updateContact(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
}

export class HttpNextActionRepository implements NextActionRepositoryPort {
  async listNextActions(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async getContactNextActions(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async findByIdempotencyKey(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async createNextAction(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async updateNextAction(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
}

export class HttpBookingRepository implements BookingRepositoryPort {
  async listBookings(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async getContactBookings(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async getBookingDetail(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async createBooking(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
  async updateBooking(): Promise<any> {
    throw new Error('HTTP Adapter not implemented in V0.1. Use Mock Adapter.');
  }
}
