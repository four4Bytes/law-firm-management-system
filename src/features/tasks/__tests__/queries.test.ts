import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getActiveUsers, getTaskById, getTaskDetailRowById, type TaskDetailRow } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
  },
}));

const mockTaskData = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  title: "Task title",
  description: "Task description",
  status: "Pending" as const,
  case_id: "c1",
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-02"),
  taskAssignments: [{ user_id: "u2", user: { name: "Jane Assignee" } }],
  ...overrides,
});

describe("getTaskById", () => {
  it("returns task with joined data", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTaskData());

    const result = await getTaskById("t1");

    expect(result).toMatchObject({
      id: "t1",
      title: "Task title",
      case_id: "c1",
      taskAssignments: [{ user_id: "u2", user: { name: "Jane Assignee" } }],
    });
    expect(prisma.task.findUnique).toHaveBeenCalledWith({
      where: { id: "t1" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        case_id: true,
        created_at: true,
        updated_at: true,
        taskAssignments: {
          select: { user: { select: { name: true } }, user_id: true },
        },
      },
    });
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null);

    const result = await getTaskById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.task.findUnique).mockRejectedValue(error);

    await expect(getTaskById("t1")).rejects.toThrow(error);
  });
});

describe("getTaskDetailRowById", () => {
  it("maps to TaskDetailRow shape", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTaskData());

    const result = await getTaskDetailRowById("t1");

    const expected: TaskDetailRow = {
      id: "t1",
      title: "Task title",
      description: "Task description",
      status: "Pending",
      assignTo: "Jane Assignee",
      assignee_ids: ["u2"],
      updated_at: new Date("2024-06-02"),
      created_at: new Date("2024-06-01"),
    };
    expect(result).toEqual(expected);
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null);

    const result = await getTaskDetailRowById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.task.findUnique).mockRejectedValue(error);

    await expect(getTaskDetailRowById("t1")).rejects.toThrow(error);
  });
});

describe("getActiveUsers", () => {
  it("returns active users", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "u1", name: "Alice" } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { id: "u2", name: "Bob" } as any,
    ]);

    const result = await getActiveUsers();

    expect(result).toEqual([
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { is_active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.user.findMany).mockRejectedValue(error);

    await expect(getActiveUsers()).rejects.toThrow(error);
  });
});
