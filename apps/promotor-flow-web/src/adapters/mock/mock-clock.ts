import { ClockPort } from '@/modules/clock/ports';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export class MockClock implements ClockPort {
  private currentTime: Date;

  constructor(initialTime?: Date | string) {
    if (initialTime) {
      this.currentTime = typeof initialTime === 'string' ? new Date(initialTime) : new Date(initialTime);
    } else {
      // Default baseline: Wednesday, 12 August 2026 10:00 AM WIB
      this.currentTime = new Date('2026-08-12T10:00:00+07:00');
    }
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  nowIso(): string {
    return this.currentTime.toISOString();
  }

  setNow(dateInput: Date | string): void {
    this.currentTime = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
  }

  advanceDays(days: number): void {
    const next = new Date(this.currentTime);
    next.setDate(next.getDate() + days);
    this.currentTime = next;
  }

  formatDayDate(dateInput?: Date | string): string {
    const d = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : this.currentTime;
    const dayName = DAYS[d.getDay()];
    const dateNum = d.getDate();
    const monthName = MONTHS[d.getMonth()];
    return `${dayName}, ${dateNum} ${monthName}`;
  }

  formatTime(dateInput?: Date | string): string {
    const d = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : this.currentTime;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getDifferenceInDays(d1: Date | string, d2: Date | string): number {
    const date1 = typeof d1 === 'string' ? new Date(d1) : d1;
    const date2 = typeof d2 === 'string' ? new Date(d2) : d2;
    
    // Normalize to start of day UTC for accurate day difference
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((utc1 - utc2) / msPerDay);
  }

  addDays(dateInput: Date | string, days: number): Date {
    const base = typeof dateInput === 'string' ? new Date(dateInput) : new Date(dateInput);
    const result = new Date(base);
    result.setDate(result.getDate() + days);
    return result;
  }
}

// Export singleton instance for app consumption
export const mockClock = new MockClock();
