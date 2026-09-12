import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { TaskLockedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

import { createSubtask, deleteSubtask, setSubtaskStatus, updateSubtask } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    subtask: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    subtaskAssignment: { findMany: vi.fn() },
    task: { findUnique: vi.fn() },
    caseAssignment: { createMany: vi.fn() },
  },
}));

type Tx = {
  subtask: typeof prisma.subtask;
  subtaskAssignment: typeof prisma.subtaskAssignment;
  task: typeof prisma.task;
  caseAssignment: typeof prisma.caseAssignment;
  $queryRaw: ReturnType<typeof vi.fn>;
};

const tx: Tx = {
  subtask: prisma.subtask,
  subtaskAssignment: prisma.subtaskAssignment,
  task: prisma.task,
  caseAssignment: prisma.caseAssignment,
  $queryRaw: vi.fn(),
};

const transactionMock = vi.mocked(prisma.$transaction) as unknown as Mock<
  (fn: (tx: Tx) => Promise<unknown>) => Promise<unknown>
>;

beforeEach(() => {
  vi.clearAllMocks();
  tx.$queryRaw = vi.fn();
  transactionMock.mockImplementation((fn) => fn(tx));
});

const mockParentTask = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  case_id: "c1",
  title: "Parent task",
  description: null,
  status: "Pending" as const,
  created_by_user_id: "u1",
  created_at: new Date("2026-09-01"),
  updated_at: new Date("2026-09-01"),
  ...overrides,
});

function mockOpenParent(caseId = "c1") {
  vi.mocked(tx.task.findUnique).mockResolvedValue(mockParentTask({ case_id: caseId }));
}

const mockSubtask = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  task_id: "t1",
  title: "Subtask",
  description: null,
  status: "Pending" as const,
  priority: null,
  due_date: null,
  created_by_user_id: "u1",
  created_at: new Date("2026-09-01"),
  updated_at: new Date("2026-09-01"),
  reminder_days: null,
  last_reminded_at: null,
  ...overrides,
});

const mockAssignment = (overrides: Record<string, unknown> = {}) => ({
  id: "sa1",
  subtask_id: "s1",
  user_id: "u2",
  created_at: new Date("2026-09-01"),
  updated_at: new Date("2026-09-01"),
  ...overrides,
});

describe("createSubtask", () => {
  it("creates a subtask with assignments and grants case membership", async () => {
    mockOpenParent();
    vi.mocked(tx.subtask.create).mockResolvedValue(mockSubtask());

    const result = await createSubtask({
      title: "Collect documents",
      task_id: "t1",
      created_by_user_id: "u1",
      assignee_ids: ["u2"],
    });

    expect(result).toMatchObject({ id: "s1" });
    expect(tx.subtask.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Collect documents",
        task_id: "t1",
        created_by_user_id: "u1",
        assignments: { create: [{ user_id: "u2" }] },
      }),
      select: { id: true },
    });
    expect(tx.caseAssignment.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        { case_id: "c1", user_id: "u2" },
        { case_id: "c1", user_id: "u1" },
      ]),
      skipDuplicates: true,
    });
  });

  it("refuses creation under a cancelled parent task", async () => {
    vi.mocked(tx.task.findUnique).mockResolvedValue(
      mockParentTask({ status: "Cancelled" as const }),
    );

    await expect(
      createSubtask({ title: "Sub", task_id: "t1", created_by_user_id: "u1" }),
    ).rejects.toBeInstanceOf(TaskLockedError);
  });

  it("rejects a missing parent task", async () => {
    vi.mocked(tx.task.findUnique).mockResolvedValue(null);

    await expect(
      createSubtask({ title: "Sub", task_id: "t1", created_by_user_id: "u1" }),
    ).rejects.toThrow("Parent task not found");
  });
});

describe("updateSubtask", () => {
  it("updates fields and diffs assignees", async () => {
    mockOpenParent();
    vi.mocked(tx.subtask.findUnique).mockResolvedValue(mockSubtask());
    vi.mocked(tx.subtaskAssignment.findMany).mockResolvedValue([mockAssignment()]);
    vi.mocked(tx.subtask.update).mockResolvedValue(mockSubtask());

    const result = await updateSubtask("s1", { title: "New title", assignee_ids: ["u3"] });

    expect(result).toMatchObject({ id: "s1", task_id: "t1" });
    expect(tx.subtask.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: expect.objectContaining({
        title: "New title",
        assignments: {
          deleteMany: { user_id: { in: ["u2"] } },
          create: [{ user_id: "u3" }],
        },
      }),
      select: { id: true, task_id: true },
    });
  });

  it("refuses updates under a cancelled parent task", async () => {
    vi.mocked(tx.subtask.findUnique).mockResolvedValue(mockSubtask());
    vi.mocked(tx.task.findUnique).mockResolvedValue(
      mockParentTask({ status: "Cancelled" as const }),
    );

    await expect(updateSubtask("s1", { title: "New" })).rejects.toBeInstanceOf(TaskLockedError);
  });
});

describe("deleteSubtask", () => {
  it("deletes the subtask without touching the parent task", async () => {
    mockOpenParent();
    vi.mocked(tx.subtask.findUnique).mockResolvedValue(mockSubtask());
    vi.mocked(tx.subtask.delete).mockResolvedValue(mockSubtask());

    const result = await deleteSubtask("s1");

    expect(result).toMatchObject({ id: "s1", task_id: "t1" });
    expect(tx.task.findUnique).toHaveBeenCalledWith({
      where: { id: "t1" },
      select: { case_id: true, status: true },
    });
    expect(tx.subtask.delete).toHaveBeenCalledWith({
      where: { id: "s1" },
      select: { id: true, task_id: true },
    });
  });
});

describe("setSubtaskStatus", () => {
  it("updates to the new status", async () => {
    mockOpenParent();
    vi.mocked(tx.subtask.findUnique).mockResolvedValue(mockSubtask());
    vi.mocked(tx.subtask.update).mockResolvedValue(mockSubtask());

    const result = await setSubtaskStatus("s1", "Completed");

    expect(result).toMatchObject({ id: "s1", task_id: "t1" });
    expect(tx.subtask.update).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: { status: "Completed" },
      select: { id: true, task_id: true },
    });
  });

  it("skips the write when the status is unchanged", async () => {
    mockOpenParent();
    vi.mocked(tx.subtask.findUnique).mockResolvedValue(
      mockSubtask({ status: "Completed" as const }),
    );

    const result = await setSubtaskStatus("s1", "Completed");

    expect(result).toEqual({ id: "s1", task_id: "t1" });
    expect(tx.subtask.update).not.toHaveBeenCalled();
  });
});
