import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  getSubtaskProgress,
  getSubtaskRowById,
  getSubtasksByTaskId,
  toSubtaskProgress,
} from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subtask: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

const mockSubtaskData = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  task_id: "t1",
  title: "Subtask title",
  description: null,
  status: "Pending" as const,
  priority: "High",
  due_date: new Date("2026-09-20"),
  created_by_user_id: "u1",
  created_at: new Date("2026-09-01"),
  updated_at: new Date("2026-09-02"),
  reminder_days: null,
  last_reminded_at: null,
  assignments: [{ user_id: "u2", user: { name: "Maria" } }],
  ...overrides,
});

describe("toSubtaskProgress", () => {
  it("returns zeros for an empty list", () => {
    expect(toSubtaskProgress([])).toEqual({ total: 0, completed: 0, percent: 0 });
  });

  it("computes progress from statuses", () => {
    expect(
      toSubtaskProgress(["Completed", "Completed", "Completed", "Pending", "InProgress"]),
    ).toEqual({
      total: 5,
      completed: 3,
      percent: 60,
    });
  });

  it("counts only Completed as done", () => {
    expect(toSubtaskProgress(["Cancelled", "Pending"])).toEqual({
      total: 2,
      completed: 0,
      percent: 0,
    });
  });

  it("reports 100 when all are completed", () => {
    expect(toSubtaskProgress(["Completed", "Completed"])).toEqual({
      total: 2,
      completed: 2,
      percent: 100,
    });
  });
});

describe("getSubtasksByTaskId", () => {
  it("returns mapped rows ordered by creation", async () => {
    vi.mocked(prisma.subtask.findMany).mockResolvedValue([mockSubtaskData()]);

    const result = await getSubtasksByTaskId("t1");

    expect(result).toEqual([
      {
        id: "s1",
        task_id: "t1",
        title: "Subtask title",
        description: null,
        status: "Pending",
        priority: "High",
        due_date: new Date("2026-09-20"),
        created_at: new Date("2026-09-01"),
        updated_at: new Date("2026-09-02"),
        created_by_user_id: "u1",
        assignees: [{ id: "u2", name: "Maria" }],
        assignee_ids: ["u2"],
      },
    ]);
    expect(prisma.subtask.findMany).toHaveBeenCalledWith({
      where: { task_id: "t1" },
      select: expect.objectContaining({ id: true }),
      orderBy: { created_at: "asc" },
    });
  });
});

describe("getSubtaskRowById", () => {
  it("returns null when missing", async () => {
    vi.mocked(prisma.subtask.findUnique).mockResolvedValue(null);

    await expect(getSubtaskRowById("missing")).resolves.toBeNull();
  });

  it("maps assignees", async () => {
    vi.mocked(prisma.subtask.findUnique).mockResolvedValue(mockSubtaskData());

    const result = await getSubtaskRowById("s1");

    expect(result).toMatchObject({
      id: "s1",
      assignees: [{ id: "u2", name: "Maria" }],
      assignee_ids: ["u2"],
    });
  });
});

describe("getSubtaskProgress", () => {
  it("derives progress from subtask statuses", async () => {
    vi.mocked(prisma.subtask.findMany).mockResolvedValue([
      mockSubtaskData({ status: "Completed" as const }),
      mockSubtaskData({ status: "Pending" as const }),
    ]);

    await expect(getSubtaskProgress("t1")).resolves.toEqual({
      total: 2,
      completed: 1,
      percent: 50,
    });
  });
});
