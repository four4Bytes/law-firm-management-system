import { CalendarDate, Time, toCalendarDateTime } from "@internationalized/date";

/**
 * Date and time conversion/formatting helpers built on `@internationalized/date`.
 *
 * @module lib/date
 *
 * ## The app-timezone invariant
 *
 * No module may read a `Date`'s fields implicitly. Everything zone-sensitive
 * goes through a helper here; `date-encapsulation.test.ts` fails the build if a
 * field reader or `getLocalTimeZone()` appears elsewhere in `src/`.
 *
 * The reason is that `Date.prototype` field readers - `getFullYear()`,
 * `getMonth()`, `getDate()`, `getHours()`, `getMinutes()`, `getDay()`,
 * `getTimezoneOffset()` - resolve against the **runtime's** zone, not the app's:
 * the browser's for client components, and the host's (normally UTC on Vercel)
 * for server code and Server Actions. Two failure modes follow, and both have
 * shipped real bugs here:
 *
 * 1. **Round-trip drift.** Reading a stored instant with a local reader and
 *    writing it back with {@link combineDateTime} (app zone) shifts it by the
 *    offset between the two. A `00:00` due date silently lands on the previous
 *    calendar day for any browser outside the app zone.
 * 2. **Asymmetric ranges.** Pairing a zone-correct lower bound with a
 *    server-local upper bound (`getStartOfDay` + `new Date(y, m, d + 1)`) widens
 *    "today" by exactly the offset - on a UTC host against Asia/Manila, "today's
 *    consultations" ran 8 hours long and counted tomorrow's morning bookings.
 *
 * {@link getAppTimeZone} stays exportable: a few external APIs demand an
 * explicit zone (`node-cron`'s `timezone` option, `CalendarDate.toDate(zone)`),
 * and those call sites name the zone rather than letting a runtime guess it.
 */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar and clock fields of an instant, as observed in one timezone. */
interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/**
 * Validates a timezone identifier against `Intl.DateTimeFormat`, throwing a
 * clear configuration error when it is present but unsupported.
 *
 * @param value - The IANA timezone value, or `undefined` when unset.
 * @param source - The configuration source name for error messages.
 * @returns The validated timezone, or `undefined` when the value was unset.
 */
function resolveTimeZone(value: string | undefined, source: string): string | undefined {
  if (value === undefined) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
  } catch {
    throw new Error(`${source} must be a valid IANA timezone, got: ${value}`);
  }
  return value;
}

/**
 * Resolves the application timezone for display formatting.
 *
 * Both the server and the client resolve from the same `APP_TIMEZONE` value
 * (`NEXT_PUBLIC_APP_TIMEZONE` is inlined for the browser), so `formatDate` /
 * `formatDateTime` produce identical text before and after hydration. When the
 * variable is unset, it defaults to `Asia/Manila` for this PH-targeted app.
 *
 * @returns An IANA timezone identifier (e.g. `"Asia/Manila"`).
 */
export function getAppTimeZone(): string {
  const value =
    typeof window === "undefined" ? process.env.APP_TIMEZONE : process.env.NEXT_PUBLIC_APP_TIMEZONE;
  return resolveTimeZone(value, "APP_TIMEZONE") ?? "Asia/Manila";
}

/**
 * Computes the start of the day (local midnight) in a given timezone for a
 * calendar date, as an absolute instant.
 *
 * @param date - The reference instant whose calendar day is wanted.
 * @param timeZone - The IANA timezone to compute the day boundary in (defaults to the app timezone).
 * @returns A Date representing `00:00` of that day in the target timezone.
 */
export function getStartOfDay(date: Date, timeZone: string = getAppTimeZone()): Date {
  const { year, month, day } = getZonedParts(date, timeZone);
  return new CalendarDate(year, month, day).toDate(timeZone);
}

/**
 * Computes the end of the day (the next day's midnight) in a given timezone for
 * a calendar date, as an absolute instant.
 *
 * The exclusive upper bound to pair with {@link getStartOfDay} for a
 * "this calendar day" query range. Do not build it from
 * `new Date(y, m, d + 1)`: those parts come from the runtime's zone, so on a
 * UTC server the bound lands 8 hours past midnight in the app timezone.
 *
 * @param date - The reference instant whose calendar day is wanted.
 * @param timeZone - The IANA timezone to compute the day boundary in (defaults to the app timezone).
 * @returns A Date representing `00:00` of the following day in the target timezone.
 */
export function getEndOfDay(date: Date, timeZone: string = getAppTimeZone()): Date {
  const { year, month, day } = getZonedParts(date, timeZone);
  return new CalendarDate(year, month, day).add({ days: 1 }).toDate(timeZone);
}

/**
 * Returns the current calendar day in the app timezone.
 *
 * Use instead of `@internationalized/date`'s `today(getLocalTimeZone())`, which
 * reads the browser's zone and so disagrees with the app timezone whenever they
 * differ.
 *
 * @returns Today's `CalendarDate` as observed in the app timezone.
 */
export function getToday(): CalendarDate {
  const { year, month, day } = getZonedParts(new Date(), getAppTimeZone());
  return new CalendarDate(year, month, day);
}

/**
 * Determines whether an instant falls on a calendar day before today in the
 * app timezone. Same-day times (even hours already passed) are not "past" -
 * only strictly earlier days are.
 *
 * @param date - The instant to test.
 * @returns True when `date` is on a day before today.
 */
export function isBeforeToday(date: Date): boolean {
  return getStartOfDay(date).getTime() < getStartOfDay(new Date()).getTime();
}

/**
 * Determines whether an instant falls on a calendar day after today in the
 * app timezone. Same-day times (even hours still ahead) are not "future" -
 * only strictly later days are.
 *
 * @param date - The instant to test.
 * @returns True when `date` is on a day after today.
 */
export function isAfterToday(date: Date): boolean {
  return getStartOfDay(date).getTime() > getStartOfDay(new Date()).getTime();
}

/**
 * Parses a `Date` or ISO string into an app-timezone `Date`.
 * Date-only strings (`YYYY-MM-DD`) are treated as calendar dates in the app
 * timezone to avoid the UTC-to-local shift that `new Date("YYYY-MM-DD")` produces.
 *
 * @param date - A Date object or ISO 8601 string.
 * @returns A Date object in the app timezone.
 */
function toLocalDate(date: Date | string): Date {
  if (typeof date !== "string") return date;
  if (DATE_ONLY_RE.test(date)) {
    const [y, m, d] = date.split("-").map(Number);
    return new CalendarDate(y, m, d).toDate(getAppTimeZone());
  }
  return new Date(date);
}

/**
 * Splits an instant into calendar and clock parts in a given timezone.
 *
 * The single place in this codebase that reads the fields of a `Date`. Anything
 * needing "what does this instant look like to a human" goes through here or a
 * helper built on it, so reading and writing always agree on one zone. Calling
 * `Date.prototype.getFullYear()` and friends directly reads the *runtime's* zone
 * - the browser's for client code, UTC for a deployed server - which silently
 * disagrees with the app timezone.
 *
 * @param date - The instant to decompose.
 * @param timeZone - The IANA timezone to read the fields in.
 * @returns The year, month, day, hour, and minute observed in `timeZone`.
 */
function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
  };
}

/**
 * Converts a JS `Date` to an `@internationalized/date` `CalendarDate` in the app
 * timezone.
 *
 * Reads in {@link getAppTimeZone} rather than the browser's local zone so a
 * `Date` -> `CalendarDate` -> {@link combineDateTime} round trip is lossless.
 * Using the browser zone here while `combineDateTime` writes in the app zone
 * shifts every instant by the offset between the two, which silently moves
 * date-only values (such as a `00:00` due date) onto the previous calendar day.
 *
 * @param date - The JavaScript Date to convert.
 * @returns A CalendarDate in the app timezone.
 */
export function toCalendarDate(date: Date): CalendarDate {
  const { year, month, day } = getZonedParts(date, getAppTimeZone());
  return new CalendarDate(year, month, day);
}

/**
 * Extracts the time-of-day from a JS `Date` as an `@internationalized/date` `Time`,
 * in the app timezone.
 *
 * Must read in the same zone as {@link toCalendarDate} and {@link combineDateTime},
 * or picker round-trips drift by the browser/app offset.
 *
 * @param date - The Date to extract time from.
 * @returns A Time value (hours/minutes) in the app timezone.
 */
export function toTimeValue(date: Date): Time {
  const { hour, minute } = getZonedParts(date, getAppTimeZone());
  return new Time(hour, minute);
}

/**
 * Combines a calendar date and time into a single `Date` in the app timezone.
 *
 * The inverse of {@link toCalendarDate} + {@link toTimeValue}; both sides use
 * {@link getAppTimeZone} so the pair round-trips exactly.
 *
 * @param date - The calendar date portion.
 * @param time - The time portion.
 * @returns A combined JavaScript Date.
 */
export function combineDateTime(date: CalendarDate, time: Time): Date {
  return toCalendarDateTime(date, time).toDate(getAppTimeZone());
}

/**
 * Normalizes a `Date` to minute precision by zeroing seconds and milliseconds.
 * Date/time pickers only capture hour and minute, so persisted timestamps with
 * seconds would otherwise read as changed on every edit.
 *
 * @param date - The instant to normalize.
 * @returns Epoch millis truncated to the minute.
 */
export function toMinuteEpoch(date: Date): number {
  return Math.floor(date.getTime() / 60000) * 60000;
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
    timeZone: getAppTimeZone(),
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
    timeZone: getAppTimeZone(),
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${dateStr} at ${timeStr}`;
}

/**
 * Returns a time-of-day greeting for the given instant, evaluated in the
 * given timezone. Morning is before 12:00, afternoon is 12:00–17:59,
 * evening is 18:00 onward. Defaults to the app timezone so server rendering
 * and client hydration agree on the same greeting.
 *
 * @param now - The reference instant (defaults to the current time).
 * @param timeZone - The IANA timezone to read the hour in (defaults to the app timezone).
 * @returns "Good morning", "Good afternoon", or "Good evening".
 */
export function getDaypartGreeting(
  now: Date = new Date(),
  timeZone: string = getAppTimeZone(),
): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Formats the given instant as a long date string in the given timezone,
 * e.g. "Wednesday, September 23, 2026". Defaults to the app timezone so
 * server rendering and client hydration agree on the same date.
 *
 * @param now - The reference instant (defaults to the current time).
 * @param timeZone - The IANA timezone to format in (defaults to the app timezone).
 * @returns A long-form date string.
 */
export function formatTodayLong(
  now: Date = new Date(),
  timeZone: string = getAppTimeZone(),
): string {
  return now.toLocaleDateString("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
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
