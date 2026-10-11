import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/infra/prisma";
import { mockSubtask } from "@/test-utils/fixtures";

import {
  getSubtaskDetailRowById,
  getSubtasksByTaskId,
  type SubtaskDetailRow,
  type SubtaskRow,
} from "../queries";

vi.mock("@/lib/infra/prisma", () => ({
  prisma: {
    subtask: { findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

describe("getSubtasksByTaskId", () => {
  it("returns rows ordered by due date with joined assignee names", async () => {
    const listRow = {
      ...mockSubtask(),
      assignments: [{ user: { name: "Alice" } }, { user: { name: "Bob" } }],
    };
    vi.mocked(prisma.subtask.findMany).mockResolvedValue([listRow]);

    const rows = await getSubtasksByTaskId({ taskId: "t1" });

    expect(prisma.subtask.findMany).toHaveBeenCalledWith({
      where: { task_id: "t1" },
      orderBy: { due_date: "asc" },
      select: {
        id: true,
        title: true,
        status: true,
        due_date: true,
        created_at: true,
        assignments: { select: { user: { select: { name: true } } } },
      },
    });
    const expected: SubtaskRow[] = [
      {
        id: "st1",
        title: "Subtask",
        status: "Pending",
        due_date: new Date("2026-12-01T09:00:00+08:00"),
        created_at: new Date("2026-10-01T09:00:00+08:00"),
        assignTo: "Alice, Bob",
      },
    ];
    expect(rows).toEqual(expected);
  });

  it("returns an empty list when the task has no subtasks", async () => {
    vi.mocked(prisma.subtask.findMany).mockResolvedValue([]);

    await expect(getSubtasksByTaskId({ taskId: "t9" })).resolves.toEqual([]);
    expect(prisma.subtask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { task_id: "t9" } }),
    );
  });
});

describe("getSubtaskDetailRowById", () => {
  it("returns the detail row with case_id and assignee_ids", async () => {
    const detailRow = {
      ...mockSubtask(),
      assignments: [
        { user_id: "u1", user: { name: "Alice" } },
        { user_id: "u2", user: { name: "Bob" } },
      ],
      task: { case_id: "c1" },
    };
    vi.mocked(prisma.subtask.findUnique).mockResolvedValue(detailRow);

    const row = await getSubtaskDetailRowById("st1");

    expect(prisma.subtask.findUnique).toHaveBeenCalledWith({
      where: { id: "st1" },
      select: {
        id: true,
        task_id: true,
        title: true,
        description: true,
        status: true,
        due_date: true,
        created_by_user_id: true,
        created_at: true,
        updated_at: true,
        assignments: { select: { user_id: true, user: { select: { name: true } } } },
        task: { select: { case_id: true } },
      },
    });
    const expected: SubtaskDetailRow = {
      id: "st1",
      task_id: "t1",
      title: "Subtask",
      description: null,
      status: "Pending",
      due_date: new Date("2026-12-01T09:00:00+08:00"),
      created_by_user_id: "u1",
      created_at: new Date("2026-10-01T09:00:00+08:00"),
      updated_at: new Date("2026-10-01T09:00:00+08:00"),
      assignTo: [
        { id: "u1", name: "Alice" },
        { id: "u2", name: "Bob" },
      ],
      assignee_ids: ["u1", "u2"],
      case_id: "c1",
    };
    expect(row).toEqual(expected);
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.subtask.findUnique).mockResolvedValue(null);

    await expect(getSubtaskDetailRowById("missing")).resolves.toBeNull();
  });
});
