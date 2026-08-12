export interface ClockPort {
  now(): Date;
  nowIso(): string;
  formatDayDate(dateInput?: Date | string): string; // e.g., "Rabu, 12 Agustus"
  formatTime(dateInput?: Date | string): string; // e.g., "14:00"
  getDifferenceInDays(d1: Date | string, d2: Date | string): number;
  addDays(dateInput: Date | string, days: number): Date;
}
