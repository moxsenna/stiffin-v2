import { ClockPort } from '@/modules/clock/ports';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }

  nowIso(): string {
    return new Date().toISOString();
  }

  formatDayDate(dateInput?: Date | string): string {
    const d = dateInput
      ? typeof dateInput === 'string'
        ? new Date(dateInput)
        : dateInput
      : new Date();
    const dayName = DAYS[d.getDay()];
    const dateNum = d.getDate();
    const monthName = MONTHS[d.getMonth()];
    return `${dayName}, ${dateNum} ${monthName}`;
  }

  formatTime(dateInput?: Date | string): string {
    const d = dateInput
      ? typeof dateInput === 'string'
        ? new Date(dateInput)
        : dateInput
      : new Date();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getDifferenceInDays(d1: Date | string, d2: Date | string): number {
    const date1 = typeof d1 === 'string' ? new Date(d1) : d1;
    const date2 = typeof d2 === 'string' ? new Date(d2) : d2;

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

export const systemClock = new SystemClock();
