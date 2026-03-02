import { DateTime } from "luxon";
import {
  Shift,
  TimeWindow,
  WorkCenter
} from "../reflow/types";

/**
 * Converts a JS Date to a Luxon DateTime.
 */
const dt = (d: Date) => DateTime.fromJSDate(d);

/**
 * Checks whether a date is inside any shift.
 */
export function isWithinShift(date: Date, shifts: Shift[]): boolean {
  const t = dt(date);

  return shifts.some(s =>
    s.dayOfWeek === (t.weekday % 7) &&
    t.hour >= s.startHour &&
    t.hour < s.endHour
  );
}

/**
 * Returns the shift start on the same day.
 */
function getShiftStart(date: DateTime, shift: Shift) {
  return date.set({
    hour: shift.startHour,
    minute: 0,
    second: 0,
    millisecond: 0
  });
}

/**
 * Returns the shift end on the same day.
 */
function getShiftEnd(date: DateTime, shift: Shift) {
  return date.set({
    hour: shift.endHour,
    minute: 0,
    second: 0,
    millisecond: 0
  });
}

/**
 * Finds the next valid shift start after the given time.
 */
export function nextShiftStart(date: Date, shifts: Shift[]): Date {
  let cursor = dt(date);

  // Search up to 14 days forward (safeguard).
  for (let i = 0; i < 14; i++) {
    const day = cursor.plus({ days: i });

    for (const shift of shifts) {
      if (shift.dayOfWeek !== (day.weekday % 7)) continue;

      const shiftStart = getShiftStart(day, shift);

      if (shiftStart > cursor) {
        return shiftStart.toJSDate();
      }
    }
  }

  throw new Error("No future shift found");
}

/**
 * Moves a date past a maintenance window if it falls inside one.
 */
export function movePastMaintenance(
  date: Date,
  windows: TimeWindow[]
): Date {

  for (const w of windows) {
    if (date >= w.start && date < w.end) {
      return w.end;
    }
  }

  return date;
}

/**
 * Finds the active shift at a given time.
 */
function getActiveShift(date: Date, shifts: Shift[]): Shift | undefined {
  const t = dt(date);

  return shifts.find(s =>
    s.dayOfWeek === (t.weekday % 7) &&
    t.hour >= s.startHour &&
    t.hour < s.endHour
  );
}

/**
 * Core engine.
 *
 * Adds working minutes while respecting:
 * - shifts
 * - maintenance
 * - pause/resume
 */
export function addWorkingMinutes(
  start: Date,
  durationMinutes: number,
  workCenter: WorkCenter
): Date {

  let current = dt(start);
  let remaining = durationMinutes;

  while (remaining > 0) {

    //Ensure inside shift
    if (!isWithinShift(current.toJSDate(), workCenter.shifts)) {
      current = dt(nextShiftStart(current.toJSDate(), workCenter.shifts));
      continue;
    }

    //Skip maintenance
    const moved = movePastMaintenance(
      current.toJSDate(),
      workCenter.maintenanceWindows
    );

    if (moved.getTime() !== current.toMillis()) {
      current = dt(moved);
      continue;
    }

    //Get active shift
    const shift = getActiveShift(current.toJSDate(), workCenter.shifts);

    if (!shift) {
      current = dt(nextShiftStart(current.toJSDate(), workCenter.shifts));
      continue;
    }

    const shiftEnd = getShiftEnd(current, shift);

    // minutes available before shift ends
    const available = Math.floor(
      shiftEnd.diff(current, "minutes").minutes
    );

    const workNow = Math.min(available, remaining);

    current = current.plus({ minutes: workNow });
    remaining -= workNow;
  }

  return current.toJSDate();
}