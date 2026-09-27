import { CalendarDate, Time } from "@internationalized/date";
import { afterEach, describe, expect, it } from "vitest";

import {
  combineDateTime,
  formatTodayLong,
  getAppTimeZone,
  getDaypartGreeting,
  getStartOfDay,
  toCalendarDate,
  toTimeValue,
} from "@/lib/primitives/date";

const originalAppTimeZone = process.env.APP_TIMEZONE;

afterEach(() => {
  if (originalAppTimeZone === undefined) {
    delete process.env.APP_TIMEZONE;
  } else {
    process.env.APP_TIMEZONE = originalAppTimeZone;
  }
});

describe("getAppTimeZone", () => {
  it("returns the configured APP_TIMEZONE when valid", () => {
    process.env.APP_TIMEZONE = "Asia/Manila";
    expect(getAppTimeZone()).toBe("Asia/Manila");
  });

  it("throws a clear config error for an invalid timezone", () => {
    process.env.APP_TIMEZONE = "Not/AZone";
    expect(() => getAppTimeZone()).toThrow(/must be a valid IANA timezone, got: Not\/AZone/);
  });

  it("falls back to Asia/Manila when unset", () => {
    delete process.env.APP_TIMEZONE;
    expect(getAppTimeZone()).toBe("Asia/Manila");
  });
});

describe("getStartOfDay", () => {
  it("returns local midnight of the day in the given timezone", () => {
    const date = new Date("2026-08-09T10:00:00Z");
    expect(getStartOfDay(date, "UTC")).toEqual(new Date("2026-08-09T00:00:00.000Z"));
  });

  it("resolves the boundary in the app timezone", () => {
    process.env.APP_TIMEZONE = "Asia/Tokyo";
    const date = new Date("2026-08-09T10:00:00Z");
    expect(getStartOfDay(date)).toEqual(new Date("2026-08-08T15:00:00.000Z"));
  });
});

describe("combineDateTime", () => {
  it("combines the calendar value in the app timezone", () => {
    process.env.APP_TIMEZONE = "UTC";
    const result = combineDateTime(new CalendarDate(2026, 8, 9), new Time(9, 30));
    expect(result.toISOString()).toBe("2026-08-09T09:30:00.000Z");
  });
});

describe("picker round-trip", () => {
  // Oracle: read the same instant through Intl in the app timezone. toCalendarDate
  // and toTimeValue must agree with it, which is only true if they read in the
  // app zone rather than the ambient/browser one.
  const appZoneParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: getAppTimeZone(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour") };
  };

  it.each([
    ["Asia/Manila", 0, 0],
    ["Asia/Manila", 9, 0],
    ["Asia/Manila", 23, 30],
    ["UTC", 0, 0],
    ["America/New_York", 14, 45],
    ["Pacific/Auckland", 0, 0],
  ])("reads %s %s:%s back in the app timezone", (zone, hour, minute) => {
    process.env.APP_TIMEZONE = zone;
    const instant = combineDateTime(new CalendarDate(2026, 8, 9), new Time(hour, minute));
    const expected = appZoneParts(instant);

    expect(toCalendarDate(instant)).toEqual(
      new CalendarDate(expected.year, expected.month, expected.day),
    );
    expect(toTimeValue(instant).hour).toBe(expected.hour);
    expect(toTimeValue(instant).minute).toBe(minute);
  });

  it.each([
    ["Asia/Manila", 0, 0],
    ["Asia/Manila", 9, 0],
    ["Asia/Manila", 23, 30],
    ["America/New_York", 0, 0],
    ["Pacific/Auckland", 0, 0],
  ])("round-trips a %s %s:%s value unchanged", (zone, hour, minute) => {
    process.env.APP_TIMEZONE = zone;
    const original = combineDateTime(new CalendarDate(2026, 8, 9), new Time(hour, minute));

    expect(combineDateTime(toCalendarDate(original), toTimeValue(original))).toEqual(original);
  });
});

describe("getDaypartGreeting", () => {
  it.each([
    // Instants expressed in UTC; Manila (UTC+8) dayparts in comments.
    ["2026-09-22T16:00:00.000Z", "Good morning"], // Wed 00:00 Manila
    ["2026-09-23T03:59:00.000Z", "Good morning"], // Wed 11:59 Manila
    ["2026-09-23T04:00:00.000Z", "Good afternoon"], // Wed 12:00 Manila
    ["2026-09-23T09:59:00.000Z", "Good afternoon"], // Wed 17:59 Manila
    ["2026-09-23T10:00:00.000Z", "Good evening"], // Wed 18:00 Manila
    ["2026-09-23T15:59:00.000Z", "Good evening"], // Wed 23:59 Manila
  ])("greets %s with %s in the app timezone", (iso, expected) => {
    process.env.APP_TIMEZONE = "Asia/Manila";
    expect(getDaypartGreeting(new Date(iso))).toBe(expected);
  });

  it("reads the hour in the given timezone", () => {
    expect(getDaypartGreeting(new Date("2026-09-23T04:00:00.000Z"), "UTC")).toBe("Good morning");
  });
});

describe("formatTodayLong", () => {
  it("formats the calendar date in the app timezone", () => {
    process.env.APP_TIMEZONE = "Asia/Manila";
    // 20:00 UTC is already the next day in Manila.
    expect(formatTodayLong(new Date("2026-09-23T20:00:00.000Z"))).toBe(
      "Thursday, September 24, 2026",
    );
  });

  it("formats the calendar date in the given timezone", () => {
    expect(formatTodayLong(new Date("2026-09-23T20:00:00.000Z"), "UTC")).toBe(
      "Wednesday, September 23, 2026",
    );
  });
});
