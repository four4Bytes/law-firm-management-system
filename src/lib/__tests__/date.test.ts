import { CalendarDate, Time } from "@internationalized/date";
import { afterEach, describe, expect, it } from "vitest";

import {
  combineDateTime,
  formatTodayLong,
  getAppTimeZone,
  getDaypartGreeting,
  getStartOfDay,
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

describe("getDaypartGreeting", () => {
  it.each([
    [new Date(2026, 8, 23, 0, 0), "Good morning"],
    [new Date(2026, 8, 23, 11, 59), "Good morning"],
    [new Date(2026, 8, 23, 12, 0), "Good afternoon"],
    [new Date(2026, 8, 23, 17, 59), "Good afternoon"],
    [new Date(2026, 8, 23, 18, 0), "Good evening"],
    [new Date(2026, 8, 23, 23, 59), "Good evening"],
  ])("greets %s with %s", (now, expected) => {
    expect(getDaypartGreeting(now)).toBe(expected);
  });
});

describe("formatTodayLong", () => {
  it("formats a date with weekday, month, day, and year", () => {
    expect(formatTodayLong(new Date(2026, 8, 23, 10, 30))).toBe("Wednesday, September 23, 2026");
  });
});
