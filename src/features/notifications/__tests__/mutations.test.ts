import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { pruneNotifications } from "@/features/notifications/mutations";
import { prisma } from "@/lib/infra/prisma";

vi.mock("@/lib/infra/prisma", () => ({
  prisma: {
    notification: { deleteMany: vi.fn() },
  },
}));

const originalAppTimeZone = process.env.APP_TIMEZONE;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // 2026-08-09 18:00 in Manila.
  vi.setSystemTime(new Date("2026-08-09T10:00:00Z"));
  process.env.APP_TIMEZONE = "Asia/Manila";
});

afterEach(() => {
  vi.useRealTimers();
  if (originalAppTimeZone === undefined) {
    delete process.env.APP_TIMEZONE;
  } else {
    process.env.APP_TIMEZONE = originalAppTimeZone;
  }
});

describe("pruneNotifications", () => {
  it("deletes notifications older than the retention window", async () => {
    vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 3 });

    const result = await pruneNotifications(90);

    expect(result).toBe(3);
    // Start of 2026-05-11 in Manila, not "now minus 90 days" on the host's clock.
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { created_at: { lt: new Date("2026-05-10T16:00:00Z") } },
    });
  });

  it("returns zero when nothing is old enough", async () => {
    vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 0 });

    const result = await pruneNotifications(90);

    expect(result).toBe(0);
  });

  it("rejects a negative retention window", async () => {
    await expect(pruneNotifications(-1)).rejects.toThrow(
      "retentionDays must be a non-negative safe integer",
    );
    expect(prisma.notification.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects a non-integer retention window", async () => {
    await expect(pruneNotifications(3.5)).rejects.toThrow(
      "retentionDays must be a non-negative safe integer",
    );
    expect(prisma.notification.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects an unsafe retention window", async () => {
    await expect(pruneNotifications(Number.MAX_SAFE_INTEGER + 1)).rejects.toThrow(
      "retentionDays must be a non-negative safe integer",
    );
    expect(prisma.notification.deleteMany).not.toHaveBeenCalled();
  });
});
