import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/infra/prisma";
import { mockMilestone as mockBaseMilestone } from "@/test-utils/fixtures";

import {
  getMilestoneById,
  getMilestoneRowById,
  getMilestonesPaginated,
  type MilestoneRow,
} from "../queries";

vi.mock("@/lib/infra/prisma", () => ({
  prisma: { caseMilestone: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

const mockMilestone = (overrides: Record<string, unknown> = {}) => ({
  ...mockBaseMilestone(),
  title: "Initial Filing",
  description: "File the initial paperwork",
  due_date: new Date("2024-07-15"),
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

describe("getMilestonesPaginated", () => {
  const mockMilestone = (overrides: Record<string, unknown> = {}) => ({
    ...mockBaseMilestone(),
    id: "m1",
    title: "File complaint",
    due_date: new Date("2024-07-01"),
    case_id: "1",
    reminder_days: null,
    ...overrides,
  });

  it("returns mapped milestone rows", async () => {
    const milestones = [
      mockMilestone(),
      mockMilestone({ id: "m2", title: "Pre-trial", due_date: new Date("2024-08-01") }),
    ];
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue(milestones);

    const result = await getMilestonesPaginated({ caseId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "m1",
      title: "File complaint",
      description: null,
      due_date: milestones[0].due_date,
      status: "Pending",
    });
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([mockMilestone()]);

    await getMilestonesPaginated({ caseId: "1", search: "complaint" });

    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", title: { contains: "complaint", mode: "insensitive" } },
      }),
    );
  });

  it("filters by a single status", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([mockMilestone()]);

    await getMilestonesPaginated({ caseId: "1", filters: { status: ["Pending"] } });

    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", status: { in: ["Pending"] } },
      }),
    );
  });

  it("filters by multiple statuses", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([mockMilestone()]);

    await getMilestonesPaginated({ caseId: "1", filters: { status: ["Pending", "Done"] } });

    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", status: { in: ["Pending", "Done"] } },
      }),
    );
  });

  it("combines status filter with search", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([mockMilestone()]);

    await getMilestonesPaginated({
      caseId: "1",
      search: "complaint",
      filters: { status: ["Done"] },
    });

    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          case_id: "1",
          title: { contains: "complaint", mode: "insensitive" },
          status: { in: ["Done"] },
        },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const milestones = Array.from({ length: 4 }, (_, i) => mockMilestone({ id: String(i + 1) }));
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue(milestones);

    const result = await getMilestonesPaginated({ caseId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);

    const result = await getMilestonesPaginated({ caseId: "1" });

    expect(result.rows).toEqual([]);
  });

  it("sorts by title ascending", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);
    await getMilestonesPaginated({
      caseId: "1",
      sort: { column: "title", direction: "asc" },
    });
    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by title descending", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);
    await getMilestonesPaginated({
      caseId: "1",
      sort: { column: "title", direction: "desc" },
    });
    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by due_date ascending", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);
    await getMilestonesPaginated({
      caseId: "1",
      sort: { column: "due_date", direction: "asc" },
    });
    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ due_date: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by status descending", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);
    await getMilestonesPaginated({
      caseId: "1",
      sort: { column: "status", direction: "desc" },
    });
    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ status: "desc" }, { id: "asc" }] }),
    );
  });
});
