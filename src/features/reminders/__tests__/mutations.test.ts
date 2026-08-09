import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  claimConsultationReminder,
  claimMilestoneReminder,
  REMINDER_SUPPRESSED_AT,
  suppressConsultationOverdue,
  suppressMilestoneOverdue,
} from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    caseMilestone: { updateMany: vi.fn(), update: vi.fn() },
    consultation: { updateMany: vi.fn(), update: vi.fn() },
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

describe("claimMilestoneReminder", () => {
  it("claims when never reminded", async () => {
    vi.mocked(prisma.caseMilestone.updateMany).mockResolvedValue({ count: 1 });

    const result = await claimMilestoneReminder("m1");

    expect(result).toBe(true);
    expect(prisma.caseMilestone.updateMany).toHaveBeenCalledWith({
      where: {
        id: "m1",
        OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: expect.any(Date) } }],
      },
      data: { last_reminded_at: expect.any(Date) },
    });
  });

  it("returns false when the record was already claimed today", async () => {
    vi.mocked(prisma.caseMilestone.updateMany).mockResolvedValue({ count: 0 });

    const result = await claimMilestoneReminder("m1");

    expect(result).toBe(false);
  });
});

describe("claimConsultationReminder", () => {
  it("claims an unclaimed consultation", async () => {
    vi.mocked(prisma.consultation.updateMany).mockResolvedValue({ count: 1 });

    const result = await claimConsultationReminder("c1");

    expect(result).toBe(true);
    expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "c1",
        OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: expect.any(Date) } }],
      },
      data: { last_reminded_at: expect.any(Date) },
    });
  });

  it("returns false when the record was already claimed today", async () => {
    vi.mocked(prisma.consultation.updateMany).mockResolvedValue({ count: 0 });

    const result = await claimConsultationReminder("c1");

    expect(result).toBe(false);
  });
});

describe("suppressMilestoneOverdue", () => {
  it("persists the far-future sentinel to last_reminded_at", async () => {
    vi.mocked(prisma.caseMilestone.update).mockResolvedValue({
      id: "m1",
      last_reminded_at: REMINDER_SUPPRESSED_AT,
    } as never);

    await suppressMilestoneOverdue("m1");

    expect(prisma.caseMilestone.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { last_reminded_at: REMINDER_SUPPRESSED_AT },
    });
  });
});

describe("suppressConsultationOverdue", () => {
  it("persists the far-future sentinel to last_reminded_at", async () => {
    vi.mocked(prisma.consultation.update).mockResolvedValue({
      id: "c1",
      last_reminded_at: REMINDER_SUPPRESSED_AT,
    } as never);

    await suppressConsultationOverdue("c1");

    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { last_reminded_at: REMINDER_SUPPRESSED_AT },
    });
  });
});
