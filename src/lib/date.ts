import { CalendarDate, getLocalTimeZone, Time, toCalendarDateTime } from "@internationalized/date";

export function toCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function toTimeValue(date: Date): Time {
  return new Time(date.getHours(), date.getMinutes());
}

export function combineDateTime(date: CalendarDate, time: Time): Date {
  return toCalendarDateTime(date, time).toDate(getLocalTimeZone());
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const dateStr = formatDate(d);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${dateStr} at ${timeStr}`;
}
