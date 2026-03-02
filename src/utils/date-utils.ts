import { DateTime } from "luxon";
import { Shift, TimeWindow, WorkCenter } from "../reflow/types";

/**
 * Always use UTC
 */
const toDT = (d: Date) => DateTime.fromJSDate(d, { zone: "utc" });

/**
 * Luxon weekday:
 * 1 = Monday ... 7 = Sunday
 *
 * Our shift format:
 * 0 = Sunday ... 6 = Saturday
 */
function normalizeWeekday(dt: DateTime): number {
  return dt.weekday === 7 ? 0 : dt.weekday;
}

/**
 * Check if given time is inside any shift
 */
export function isWithinShift(date: Date, shifts: Shift[]): boolean {
  const dt = toDT(date);
  const day = normalizeWeekday(dt);

  return shifts.some(
    (s) =>
      s.dayOfWeek === day &&
      dt.hour >= s.startHour &&
      dt.hour < s.endHour
  );
}

/**
 * Get active shift at given time
 */
function getActiveShift(date: Date, shifts: Shift[]): Shift | undefined {
  const dt = toDT(date);
  const day = normalizeWeekday(dt);

  return shifts.find(
    (s) =>
      s.dayOfWeek === day &&
      dt.hour >= s.startHour &&
      dt.hour < s.endHour
  );
}

/**
 * Get next valid shift start AFTER the given time
 */
export function nextShiftStart(
  date: Date,
  shifts: Shift[],
  maintenanceWindows: TimeWindow[]
): Date {

  let cursor = toDT(date).plus({ minutes: 1 });

  // @upgrade: Replace 14-day guard with due date logic
  for (let i = 0; i < 14; i++) {

    const dayCandidate = cursor.plus({ days: i }).startOf("day");
    const weekday = normalizeWeekday(dayCandidate);

    const shiftForDay = shifts
      .filter((s) => s.dayOfWeek === weekday)
      .sort((a, b) => a.startHour - b.startHour);

    for (const shift of shiftForDay) {

      const shiftStart = dayCandidate.set({
        hour: shift.startHour,
        minute: 0,
        second: 0,
        millisecond: 0
      });

      const shiftEnd = dayCandidate.set({
        hour: shift.endHour,
        minute: 0,
        second: 0,
        millisecond: 0
      });

      if (shiftStart <= cursor) continue;

      // check if shift fully blocked by maintenance
      const fullyBlocked = maintenanceWindows.some((w) => {
        const mStart = toDT(w.start);
        const mEnd = toDT(w.end);

        return (
          mStart <= shiftStart &&
          mEnd >= shiftEnd
        );
      });

      if (!fullyBlocked) {
        return shiftStart.toJSDate();
      }
    }
  }

  throw new Error("No feasible shift found within 14 days");
}

/**
 * If current time is inside maintenance window,
 * move to end of maintenance.
 */
function movePastMaintenance(
  current: DateTime,
  windows: TimeWindow[]
): DateTime {
  for (const w of windows) {
    const start = toDT(w.start);
    const end = toDT(w.end);

    if (current >= start && current < end) {
      return end;
    }
  }
  return current;
}

/**
 * CORE FUNCTION
 *
 * Adds working minutes respecting:
 * - shift boundaries
 * - maintenance windows
 * - pause/resume behavior
 */
export function addWorkingMinutes(
  start: Date,
  durationMinutes: number,
  workCenter: WorkCenter
): Date {

  let current = toDT(start);
  let remaining = durationMinutes;

  while (remaining > 0) {

    //Align to shift if outside shift
    if (!isWithinShift(current.toJSDate(), workCenter.shifts)) {
      current = toDT(
        nextShiftStart(
          current.toJSDate(),
          workCenter.shifts,
          workCenter.maintenanceWindows
        )
      );
      continue;
    }

    //Skip maintenance if inside maintenance
    const afterMaintenance = movePastMaintenance(
      current,
      workCenter.maintenanceWindows
    );

    if (!afterMaintenance.equals(current)) {
      current = afterMaintenance;
      continue;
    }

    //Get active shift
    const shift = getActiveShift(
      current.toJSDate(),
      workCenter.shifts
    );

    if (!shift) {
      current = toDT(
        nextShiftStart(
          current.toJSDate(),
          workCenter.shifts,
          workCenter.maintenanceWindows
        )
      );
      continue;
    }

    //Calculate shift end
    const shiftEnd = current.set({
      hour: shift.endHour,
      minute: 0,
      second: 0,
      millisecond: 0
    });

    const availableMinutes = Math.floor(
      shiftEnd.diff(current, "minutes").minutes
    );

    if (availableMinutes <= 0) {
      current = toDT(
        nextShiftStart(
          current.toJSDate(),
          workCenter.shifts,
          workCenter.maintenanceWindows
        )
      );
      continue;
    }

    const minutesToWork = Math.min(availableMinutes, remaining);

    current = current.plus({ minutes: minutesToWork });
    remaining -= minutesToWork;
  }

  return current.toJSDate();
}