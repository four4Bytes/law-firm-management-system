import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getStartOfDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

import {
  claimConsultationReminder,
  claimMilestoneReminder,
  REMINDER_SUPPRESSED_AT,
  retractConsultationOverdue,
  retractMilestoneOverdue,
  suppressConsultationOverdue,
  suppressMilestoneOverdue,
  unclaimConsultationReminder,
  unclaimMilestoneReminder,
} from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    caseMilestone: { updateMany: vi.fn() },
    consultation: { updateMany: vi.fn() },
  },
}));

const TODAY_START = getStartOfDay(new Date("2026-08-09T10:00:00"));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-09T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("claimMilestoneReminder", () => {
  it("claims when never reminded and returns the claim timestamp", async () => {
    vi.mocked(prisma.caseMilestone.updateMany).mockResolvedValue({ count: 1 });

    const result = await claimMilestoneReminder("m1");

    expect(result).toEqual(new Date("2026-08-09T10:00:00"));
    expect(prisma.caseMilestone.updateMany).toHaveBeenCalledWith({
      where: {
        id: "m1",
        OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: TODAY_START } }],
      },
      data: { last_reminded_at: new Date("2026-08-09T10:00:00") },
    });
  });

  it("returns null when the record was already claimed today", async () => {
    vi.mocked(prisma.caseMilestone.updateMany).mockResolvedValue({ count: 0 });

    const result = await claimMilestoneReminder("m1");

    expect(result).toBeNull();
  });
});

describe("claimConsultationReminder", () => {
  it("claims an unclaimed consultation and returns the claim timestamp", async () => {
    vi.mocked(prisma.consultation.updateMany).mockResolvedValue({ count: 1 });

    const result = await claimConsultationReminder("c1");

    expect(result).toEqual(new Date("2026-08-09T10:00:00"));
    expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "c1",
        OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: TODAY_START } }],
      },
      data: { last_reminded_at: new Date("2026-08-09T10:00:00") },
    });
  });

  it("returns null when the record was already claimed today", async () => {
    vi.mocked(prisma.consultation.updateMany).mockResolvedValue({ count: 0 });

    const result = await claimConsultationReminder("c1");

    expect(result).toBeNull();
  });
});

describe("suppressMilestoneOverdue", () => {
  it("retires an eligible milestone by writing the far-future sentinel", async () => {
    vi.mocked(prisma.caseMilestone.updateMany).mockResolvedValue({ count: 1 });

    const result = await suppressMilestoneOverdue("m1");

    expect(result).toBe(true);
    expect(prisma.caseMilestone.updateMany).toHaveBeenCalledWith({
      where: {
        id: "m1",
        OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: TODAY_START } }],
      },
      data: { last_reminded_at: REMINDER_SUPPRESSED_AT },
    });
  });

  it("returns false when another invocation already suppressed it", async () => {
    vi.mocked(prisma.caseMilestone.updateMany).mockResolvedValue({ count: 0 });

    const result = await suppressMilestoneOverdue("m1");

    expect(result).toBe(false);
  });
});

describe("suppressConsultationOverdue", () => {
  it("retires an eligible consultation by writing the far-future sentinel", async () => {
    vi.mocked(prisma.consultation.updateMany).mockResolvedValue({ count: 1 });

    const result = await suppressConsultationOverdue("c1");

    expect(result).toBe(true);
    expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "c1",
        OR: [{ last_reminded_at: null }, { last_reminded_at: { lt: TODAY_START } }],
      },
      data: { last_reminded_at: REMINDER_SUPPRESSED_AT },
    });
  });

  it("returns false when another invocation already suppressed it", async () => {
    vi.mocked(prisma.consultation.updateMany).mockResolvedValue({ count: 0 });

    const result = await suppressConsultationOverdue("c1");

    expect(result).toBe(false);
  });
});

describe("unclaimMilestoneReminder", () => {
  it("releases the claim only when the exact claim timestamp is still stored", async () => {
    const claimedAt = new Date("2026-08-09T10:00:00");

    await unclaimMilestoneReminder("m1", claimedAt);

    expect(prisma.caseMilestone.updateMany).toHaveBeenCalledWith({
      where: { id: "m1", last_reminded_at: claimedAt },
      data: { last_reminded_at: null },
    });
  });
});

describe("unclaimConsultationReminder", () => {
  it("releases the claim only when the exact claim timestamp is still stored", async () => {
    const claimedAt = new Date("2026-08-09T10:00:00");

    await unclaimConsultationReminder("c1", claimedAt);

    expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", last_reminded_at: claimedAt },
      data: { last_reminded_at: null },
    });
  });
});

describe("retractMilestoneOverdue", () => {
  it("removes the sentinel only when it is still in place", async () => {
    await retractMilestoneOverdue("m1");

    expect(prisma.caseMilestone.updateMany).toHaveBeenCalledWith({
      where: { id: "m1", last_reminded_at: REMINDER_SUPPRESSED_AT },
      data: { last_reminded_at: null },
    });
  });
});

describe("retractConsultationOverdue", () => {
  it("removes the sentinel only when it is still in place", async () => {
    await retractConsultationOverdue("c1");

    expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", last_reminded_at: REMINDER_SUPPRESSED_AT },
      data: { last_reminded_at: null },
    });
  });
});
