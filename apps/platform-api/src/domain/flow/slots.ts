export interface SlotAvailabilityRule {
  dayOfWeek: number; // 0=Sunday..6=Saturday
  startTime: string; // "HH:mm" 24h
  endTime: string;   // "HH:mm" 24h
  isActive?: boolean;
}

export interface BusyInterval {
  startAt: Date;
  endAt: Date;
}

export interface GenerateSlotsInput {
  organizationTimezone: string;
  evaluationNow: Date;
  rangeFrom: Date;
  rangeTo: Date;
  serviceDurationMinutes: number;
  weeklyRules: SlotAvailabilityRule[];
  existingBusyIntervals: BusyInterval[];
  bufferMinutes?: number;
  slotCadenceMinutes?: number;
}

export interface AvailableSlot {
  startAt: string; // ISO 8601 UTC
  endAt: string;   // ISO 8601 UTC
  localDate: string; // "YYYY-MM-DD"
  localDisplay: string; // "10:00 - 11:00"
}

/**
 * Pure timezone date helpers without external libraries.
 */
function getPartsInTimezone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  let hour = parseInt(partMap.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[partMap.weekday] ?? 0;

  return { year, month, day, hour, minute, second, dayOfWeek };
}

/**
 * Construct a UTC Date corresponding to a local year, month, day, hour, minute in the given timezone.
 */
function createDateFromLocalParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  // Use ISO representation assumption and calculate exact offset
  const pad = (n: number) => n.toString().padStart(2, '0');
  const targetLocalStr = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
  
  // Initial estimate assuming UTC
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  
  // Offset refinement loop (converges in 1-2 steps)
  for (let i = 0; i < 3; i++) {
    const parts = getPartsInTimezone(guess, timeZone);
    const guessLocalStr = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:00`;
    if (guessLocalStr === targetLocalStr) {
      break;
    }
    const diffMs =
      Date.UTC(year, month - 1, day, hour, minute, 0) -
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    guess = new Date(guess.getTime() + diffMs);
  }

  return guess;
}

/**
 * Pure slot generator engine.
 */
export function generateCandidateSlots(input: GenerateSlotsInput): AvailableSlot[] {
  const {
    organizationTimezone,
    evaluationNow,
    rangeFrom,
    rangeTo,
    serviceDurationMinutes,
    weeklyRules,
    existingBusyIntervals,
    bufferMinutes = 30,
    slotCadenceMinutes = serviceDurationMinutes,
  } = input;

  if (serviceDurationMinutes <= 0) {
    return [];
  }
  if (rangeFrom >= rangeTo) {
    return [];
  }

  const activeRules = weeklyRules.filter((r) => r.isActive !== false);
  if (activeRules.length === 0) {
    return [];
  }

  const earliestAllowedStart = new Date(evaluationNow.getTime() + bufferMinutes * 60000);
  const slots: AvailableSlot[] = [];

  // Determine local day range to evaluate
  // Start from rangeFrom - 1 day to rangeTo + 1 day to ensure full local calendar day coverage across UTC shifts
  const startDayEst = new Date(rangeFrom.getTime() - 86400000);
  const endDayEst = new Date(rangeTo.getTime() + 86400000);

  const curDay = new Date(startDayEst);
  const visitedLocalDays = new Set<string>();

  while (curDay <= endDayEst) {
    const parts = getPartsInTimezone(curDay, organizationTimezone);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localDateStr = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;

    if (!visitedLocalDays.has(localDateStr)) {
      visitedLocalDays.add(localDateStr);
      const dayOfWeek = parts.dayOfWeek;
      const dayRules = activeRules.filter((r) => r.dayOfWeek === dayOfWeek);

      for (const rule of dayRules) {
        const [sHour, sMin] = rule.startTime.split(':').map((v) => parseInt(v, 10));
        const [eHour, eMin] = rule.endTime.split(':').map((v) => parseInt(v, 10));

        const windowStart = createDateFromLocalParts(parts.year, parts.month, parts.day, sHour, sMin, organizationTimezone);
        const windowEnd = createDateFromLocalParts(parts.year, parts.month, parts.day, eHour, eMin, organizationTimezone);

        let candidateStart = new Date(windowStart);

        while (true) {
          const candidateEnd = new Date(candidateStart.getTime() + serviceDurationMinutes * 60000);
          if (candidateEnd > windowEnd) {
            break;
          }

          // Check query bounds
          const isWithinQueryRange = candidateStart >= rangeFrom && candidateEnd <= rangeTo;
          // Check buffer
          const satisfiesBuffer = candidateStart >= earliestAllowedStart;

          if (isWithinQueryRange && satisfiesBuffer) {
            // Check busy overlap
            // Overlap condition: max(startA, startB) < min(endA, endB)
            const isOverlap = existingBusyIntervals.some((busy) => {
              const overlapStart = candidateStart > busy.startAt ? candidateStart : busy.startAt;
              const overlapEnd = candidateEnd < busy.endAt ? candidateEnd : busy.endAt;
              return overlapStart < overlapEnd;
            });

            if (!isOverlap) {
              const startParts = getPartsInTimezone(candidateStart, organizationTimezone);
              const endParts = getPartsInTimezone(candidateEnd, organizationTimezone);
              const localDisplay = `${pad(startParts.hour)}:${pad(startParts.minute)} - ${pad(endParts.hour)}:${pad(endParts.minute)}`;

              slots.push({
                startAt: candidateStart.toISOString(),
                endAt: candidateEnd.toISOString(),
                localDate: localDateStr,
                localDisplay,
              });
            }
          }

          // Advance by cadence
          candidateStart = new Date(candidateStart.getTime() + slotCadenceMinutes * 60000);
        }
      }
    }

    curDay.setTime(curDay.getTime() + 43200000); // Advance 12h
  }

  // Return deduplicated and sorted slots
  const seenSlots = new Set<string>();
  const deduplicated: AvailableSlot[] = [];
  for (const s of slots) {
    if (!seenSlots.has(s.startAt)) {
      seenSlots.add(s.startAt);
      deduplicated.push(s);
    }
  }

  return deduplicated.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}
