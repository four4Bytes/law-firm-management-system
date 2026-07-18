import { CalendarDate, getLocalTimeZone, Time, toCalendarDateTime } from "@internationalized/date";

/** Date and time conversion/formatting helpers built on `@internationalized/date`. */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a `Date` or ISO string into a local-timezone `Date`.
 * Date-only strings (`YYYY-MM-DD`) are treated as local calendar dates
 * to avoid the UTC-to-local shift that `new Date("YYYY-MM-DD")` produces.
 *
 * @param date - A Date object or ISO 8601 string.
 * @returns A Date object in the local timezone.
 */
function toLocalDate(date: Date | string): Date {
  if (typeof date !== "string") return date;
  if (DATE_ONLY_RE.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new CalendarDate(y, m, d).toDate(getLocalTimeZone());
  }
  return new Date(date);
}

/**
 * Converts a JS `Date` to an `@internationalized/date` `CalendarDate` in local time.
 *
 * @param date - The JavaScript Date to convert.
 * @returns A CalendarDate in the local timezone.
 */
export function toCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Extracts the time-of-day from a JS `Date` as an `@internationalized/date` `Time`.
 *
 * @param date - The JavaScript Date to extract time from.
 * @returns A Time value (hours/minutes).
 */
export function toTimeValue(date: Date): Time {
  return new Time(date.getHours(), date.getMinutes());
}

/**
 * Combines a calendar date and time into a single local-timezone `Date`.
 *
 * @param date - The calendar date portion.
 * @param time - The time portion.
 * @returns A combined JavaScript Date in the local timezone.
 */
export function combineDateTime(date: CalendarDate, time: Time): Date {
  return toCalendarDateTime(date, time).toDate(getLocalTimeZone());
}

/**
 * Formats a `Date` or ISO string as e.g. "Jul 14, 2026".
 *
 * @param date - A Date object or ISO 8601 string.
 * @returns A formatted date string (e.g. "Jul 14, 2026").
 */
export function formatDate(date: Date | string): string {
  const d = toLocalDate(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Formats a `Date` or ISO string as e.g. "Jul 14, 2026 at 3:30 PM".
 *
 * @param date - A Date object or ISO 8601 string.
 * @returns A formatted date and time string (e.g. "Jul 14, 2026 at 3:30 PM").
 */
export function formatDateTime(date: Date | string): string {
  const d = toLocalDate(date);
  const dateStr = formatDate(d);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${dateStr} at ${timeStr}`;
}

/**
 * Formats a `Date` as a compact relative time string.
 * Examples: "5m ago", "2h ago", "3d ago", "Jul 14, 2026".
 *
 * @param date - A Date object or ISO 8601 string.
 * @returns A relative time string for recent dates, formatted date for older ones.
 */
export function timeAgo(date: Date | string): string {
  const d = toLocalDate(date);
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return formatDate(d);
}
