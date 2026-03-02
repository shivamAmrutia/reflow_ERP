import { DateTime } from "luxon";
import { Shift, TimeWindow, WorkCenter } from "../reflow/types";

export const toDateTime = (date: Date) =>
  DateTime.fromJSDate(date);

export function isWithinShift(date: Date, shifts: Shift[]): boolean {
  const dt = toDateTime(date);

  return shifts.some(
    (s) =>
      s.dayOfWeek === dt.weekday % 7 &&
      dt.hour >= s.startHour &&
      dt.hour < s.endHour
  );
}

export function nextShiftStart(date: Date, shifts: Shift[]): Date {
  // placeholder — implemented later
  return date;
}

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

export function addWorkingMinutes(
  start: Date,
  durationMinutes: number,
  workCenter: WorkCenter
): Date {
  // CORE LOGIC COMES LATER
  return start;
}