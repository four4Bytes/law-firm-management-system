import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getMilestoneById, getMilestoneRowById, type MilestoneRow } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { caseMilestone: { findUnique: vi.fn() } },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMilestone = (overrides: Record<string, unknown> = {}): any => ({
  id: "m1",
  title: "Initial Filing",
  description: "File the initial paperwork",
  due_date: new Date("2024-07-15"),
  status: "Pending",
  case_id: "c1",
  created_by_user_id: "u1",
  created_at: new Date("2024-07-15"),
  updated_at: new Date("2024-07-15"),
  ...overrides,
});

describe("getMilestoneById", () => {
  it("returns milestone with case_id", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(mockMilestone());

    const result = await getMilestoneById("m1");

    expect(result).toMatchObject({
      id: "m1",
      title: "Initial Filing",
      description: "File the initial paperwork",
      due_date: new Date("2024-07-15"),
      status: "Pending",
      case_id: "c1",
    });
    expect(prisma.caseMilestone.findUnique).toHaveBeenCalledWith({
      where: { id: "m1" },
      select: {
        id: true,
        title: true,
        description: true,
        due_date: true,
        status: true,
        case_id: true,
      },
    });
  });

  it("returns milestone with null description", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(
      mockMilestone({ description: null }),
    );

    const result = await getMilestoneById("m1");

    expect(result?.description).toBeNull();
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(null);

    const result = await getMilestoneById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.caseMilestone.findUnique).mockRejectedValue(error);

    await expect(getMilestoneById("m1")).rejects.toThrow(error);
  });
});

describe("getMilestoneRowById", () => {
  it("maps to MilestoneRow shape", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(mockMilestone());

    const result = await getMilestoneRowById("m1");

    const expected: MilestoneRow = {
      id: "m1",
      title: "Initial Filing",
      description: "File the initial paperwork",
      due_date: new Date("2024-07-15"),
      status: "Pending",
    };
    expect(result).toEqual(expected);
  });

  it("handles null description", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(
      mockMilestone({ description: null }),
    );

    const result = await getMilestoneRowById("m1");

    expect(result).toMatchObject({
      description: null,
    });
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(null);

    const result = await getMilestoneRowById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.caseMilestone.findUnique).mockRejectedValue(error);

    await expect(getMilestoneRowById("m1")).rejects.toThrow(error);
  });
});
