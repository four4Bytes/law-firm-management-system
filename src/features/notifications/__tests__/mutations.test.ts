import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { pruneNotifications } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { deleteMany: vi.fn() },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-09T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pruneNotifications", () => {
  it("deletes notifications older than the retention window", async () => {
    vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 3 });

    const result = await pruneNotifications(90);

    expect(result).toBe(3);
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { created_at: { lt: new Date("2026-05-11T10:00:00") } },
    });
  });

  it("returns zero when nothing is old enough", async () => {
    vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 0 });

    const result = await pruneNotifications(90);

    expect(result).toBe(0);
  });
});
