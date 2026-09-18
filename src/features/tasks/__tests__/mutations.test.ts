import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { getDocumentFilePathsByTaskId } from "@/features/documents/queries";
import { TaskLockedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import {
  addTaskReviewer,
  applyReviewDecision,
  createTask,
  deleteTask,
  deriveTaskStatus,
  removeTaskReviewer,
  setAssignmentStatus,
  updateTask,
} from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    task: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    taskReviewer: {
      updateMany: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    taskAssignment: { updateMany: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
    caseAssignment: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));

vi.mock("@/features/documents/queries", () => ({
  getDocumentFilePathsByTaskId: vi.fn(),
}));

vi.mock("@/lib/storage-cleanup", () => ({
  deleteDocumentFiles: vi.fn(),
}));

const mockTask = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  case_id: "c1",
  title: "Task title",
  description: null,
  status: "Pending" as const,
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  ...overrides,
});

type Tx = {
  task: unknown;
  taskReviewer: unknown;
  taskAssignment: unknown;
  caseAssignment: unknown;
  $queryRaw: ReturnType<typeof vi.fn>;
};

const tx: Tx = {
  task: prisma.task,
  taskReviewer: prisma.taskReviewer,
  taskAssignment: prisma.taskAssignment,
  caseAssignment: prisma.caseAssignment,
  $queryRaw: vi.fn(),
};

const transactionMock = vi.mocked(prisma.$transaction) as unknown as Mock<
  (fn: (tx: Tx) => Promise<unknown>) => Promise<unknown>
>;

const mockTaskReviewer = (overrides: Record<string, unknown> = {}) => ({
  id: "tr1",
  task_id: "t1",
  reviewer_user_id: "u4",
  decision: "Pending" as const,
  reviewed_at: null,
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  ...overrides,
});

const mockTaskAssignment = (overrides: Record<string, unknown> = {}) => ({
  id: "ta1",
  task_id: "t1",
  user_id: "u2",
  status: "Todo" as const,
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.caseAssignment.findMany).mockResolvedValue([]);
  vi.mocked((prisma.taskAssignment as unknown as { findFirst: Mock }).findFirst).mockResolvedValue(
    null as unknown as never,
  );
  vi.mocked((prisma.taskReviewer as unknown as { count: Mock }).count).mockResolvedValue(
    1 as unknown as never,
  );
  transactionMock.mockImplementation((fn) => fn(tx as never));
});

describe("createTask", () => {
  it("creates a task with the creator as default reviewer", async () => {
    vi.mocked(prisma.task.create).mockResolvedValue(mockTask());

    const result = await createTask({
      title: "Task title",
      case_id: "c1",
      created_by_user_id: "u1",
    });

    expect(result.id).toBe("t1");
    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        title: "Task title",
        status: "Pending",
        case_id: "c1",
        created_by_user_id: "u1",
        taskReviewers: { create: { reviewer_user_id: "u1" } },
      },
      select: { id: true },
    });
  });

  it("grants case membership to the creator", async () => {
    vi.mocked(prisma.task.create).mockResolvedValue(mockTask());

    await createTask({
      title: "Task title",
      case_id: "c1",
      created_by_user_id: "u1",
    });

    expect(prisma.caseAssignment.createMany).toHaveBeenCalledWith({
      data: [{ case_id: "c1", user_id: "u1" }],
      skipDuplicates: true,
    });
  });

  it("creates a task with assignees", async () => {
    vi.mocked(prisma.task.create).mockResolvedValue(mockTask());

    const result = await createTask({
      title: "Task with assignees",
      case_id: "c1",
      created_by_user_id: "u1",
      assignee_ids: ["u2", "u3"],
    });

    expect(result.id).toBe("t1");
    expect(prisma.task.create).toHaveBeenCalledWith({
      data: {
        title: "Task with assignees",
        status: "Pending",
        case_id: "c1",
        created_by_user_id: "u1",
        taskAssignments: { create: [{ user_id: "u2" }, { user_id: "u3" }] },
        taskReviewers: { create: { reviewer_user_id: "u1" } },
      },
      select: { id: true },
    });
    expect(prisma.caseAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { case_id: "c1", user_id: "u2" },
        { case_id: "c1", user_id: "u3" },
        { case_id: "c1", user_id: "u1" },
      ],
      skipDuplicates: true,
    });
  });

  it("creates a task with optional description", async () => {
    vi.mocked(prisma.task.create).mockResolvedValue(mockTask());

    await createTask({
      title: "Task with description",
      description: "A description",
      case_id: "c1",
      created_by_user_id: "u1",
    });

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ description: "A description" }),
      select: { id: true },
    });
  });

  it("propagates error when creating task fails", async () => {
    const error = new Error("Database connection failed");
    vi.mocked(prisma.task.create).mockRejectedValue(error);

    await expect(
      createTask({
        title: "Task title",
        case_id: "c1",
        created_by_user_id: "u1",
      }),
    ).rejects.toThrow(error);
  });
});

describe("updateTask", () => {
  it("updates a task", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());

    const result = await updateTask("t1", { title: "Updated title" });

    expect(result.id).toBe("t1");
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { title: "Updated title" },
      select: { id: true, case_id: true },
    });
    expect(prisma.caseAssignment.createMany).not.toHaveBeenCalled();
  });

  it("updates a task with assignee sync", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ user_id: "u1", status: "Done" }),
    ]);
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Pending" }),
    ]);

    await updateTask("t1", {
      title: "Updated",
      assignee_ids: ["u2"],
    });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: {
        title: "Updated",
        taskAssignments: {
          deleteMany: { user_id: { in: ["u1"] } },
          create: [{ user_id: "u2" }],
        },
      },
      select: { id: true, case_id: true },
    });
    expect(prisma.caseAssignment.createMany).toHaveBeenCalledWith({
      data: [{ case_id: "c1", user_id: "u2" }],
      skipDuplicates: true,
    });
  });

  it("preserves unaffected assignees when syncing the assignee list", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ user_id: "u1", status: "Done" }),
      mockTaskAssignment({ user_id: "u3", status: "Done" }),
    ]);
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Pending" }),
    ]);

    await updateTask("t1", {
      assignee_ids: ["u2", "u3"],
    });

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: {
        taskAssignments: {
          deleteMany: { user_id: { in: ["u1"] } },
          create: [{ user_id: "u2" }],
        },
      },
      select: { id: true, case_id: true },
    });
  });

  it("propagates error when updating nonexistent task", async () => {
    const error = new Error("Record not found");
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());
    vi.mocked(prisma.task.update).mockRejectedValue(error);

    await expect(updateTask("999", { title: "Updated title" })).rejects.toThrow(error);
  });
});

describe("deleteTask", () => {
  it("deletes the task's S3 documents then the task", async () => {
    vi.mocked(prisma.task.delete).mockResolvedValue(mockTask());
    vi.mocked(getDocumentFilePathsByTaskId).mockResolvedValue(["tasks/t1/a.pdf", "tasks/t1/b.pdf"]);
    vi.mocked(deleteDocumentFiles).mockResolvedValue(undefined);

    const result = await deleteTask("t1");

    expect(result.id).toBe("t1");
    expect(getDocumentFilePathsByTaskId).toHaveBeenCalledWith("t1", tx);
    expect(deleteDocumentFiles).toHaveBeenCalledWith(["tasks/t1/a.pdf", "tasks/t1/b.pdf"]);
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: "t1" }, select: { id: true } });
  });

  it("skips S3 deletion when the task has no documents", async () => {
    vi.mocked(prisma.task.delete).mockResolvedValue(mockTask());
    vi.mocked(getDocumentFilePathsByTaskId).mockResolvedValue([]);
    vi.mocked(deleteDocumentFiles).mockResolvedValue(undefined);

    await deleteTask("t1");

    expect(deleteDocumentFiles).toHaveBeenCalledWith([]);
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: "t1" }, select: { id: true } });
  });

  it("propagates error when deleting nonexistent task", async () => {
    const error = new Error("Record not found");
    vi.mocked(getDocumentFilePathsByTaskId).mockResolvedValue([]);
    vi.mocked(prisma.task.delete).mockRejectedValue(error);

    await expect(deleteTask("999")).rejects.toThrow(error);
  });

  it("propagates error when deleting the task record fails", async () => {
    const error = new Error("DB down");
    vi.mocked(getDocumentFilePathsByTaskId).mockResolvedValue(["tasks/t1/a.pdf"]);
    vi.mocked(prisma.task.delete).mockRejectedValue(error);

    await expect(deleteTask("t1")).rejects.toThrow(error);
  });
});

describe("setAssignmentStatus", () => {
  it("submits the assignee and derives InReview when every assignee has submitted", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Done" }),
      mockTaskAssignment({ user_id: "u3", status: "Done" }),
    ]);
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Pending" }),
    ]);

    const result = await setAssignmentStatus("t1", "u2", "Done");

    expect(result).toEqual({ taskStatus: "InReview" });
    expect(prisma.taskAssignment.updateMany).toHaveBeenCalledWith({
      where: { task_id: "t1", user_id: "u2" },
      data: { status: "Done" },
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "InReview" },
      select: { id: true },
    });
  });

  it("reverts to Todo when an assignee un-submits", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "InReview" }));
    vi.mocked(prisma.taskAssignment.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Done" }),
      mockTaskAssignment({ user_id: "u3", status: "Todo" }),
    ]);
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Pending" }),
    ]);

    const result = await setAssignmentStatus("t1", "u2", "Todo");

    expect(result).toEqual({ taskStatus: "Pending" });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Pending" },
      select: { id: true },
    });
  });

  it("throws TaskLockedError when the task is Done", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "Done" }));

    await expect(setAssignmentStatus("t1", "u2", "Done")).rejects.toThrow(TaskLockedError);
  });
});

describe("addTaskReviewer", () => {
  it("adds a reviewer and grants case membership", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskReviewer.upsert).mockResolvedValue(mockTaskReviewer());
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Todo" }),
    ]);
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Pending" }),
    ]);

    const result = await addTaskReviewer("t1", "u4");

    expect(result.id).toBe("t1");
    expect(prisma.taskReviewer.upsert).toHaveBeenCalledWith({
      where: { task_id_reviewer_user_id: { task_id: "t1", reviewer_user_id: "u4" } },
      create: { task_id: "t1", reviewer_user_id: "u4" },
      update: { decision: "Pending", reviewed_at: null },
    });
    expect(prisma.caseAssignment.createMany).toHaveBeenCalledWith({
      data: [{ case_id: "c1", user_id: "u4" }],
      skipDuplicates: true,
    });
  });

  it("throws when the task does not exist", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null);

    await expect(addTaskReviewer("999", "u4")).rejects.toThrow("Task not found");
    expect(prisma.taskReviewer.upsert).not.toHaveBeenCalled();
  });
});

describe("addTaskReviewer (status transitions)", () => {
  it("reopens a Done task and resets reviewer decisions and assignee submissions to Todo", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "Done" }));
    vi.mocked(prisma.taskReviewer.upsert).mockResolvedValue(mockTaskReviewer());
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Approved" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Todo" }),
    ]);
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());

    const result = await addTaskReviewer("t1", "u4");

    expect(result.id).toBe("t1");
    expect(prisma.taskReviewer.updateMany).toHaveBeenCalledWith({
      where: { task_id: "t1" },
      data: { decision: "Pending", reviewed_at: null },
    });
    expect(prisma.taskAssignment.updateMany).toHaveBeenCalledWith({
      where: { task_id: "t1" },
      data: { status: "Todo" },
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Pending" },
      select: { id: true },
    });
  });
});

describe("removeTaskReviewer", () => {
  it("throws when removing the task creator", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());

    await expect(removeTaskReviewer("t1", "u1")).rejects.toThrow(
      "Cannot remove the task creator as a reviewer",
    );
  });

  it("deletes the reviewer row", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskReviewer.deleteMany).mockResolvedValue({ count: 1 });

    const result = await removeTaskReviewer("t1", "u4");

    expect(result.id).toBe("t1");
    expect(prisma.taskReviewer.deleteMany).toHaveBeenCalledWith({
      where: { task_id: "t1", reviewer_user_id: "u4" },
    });
  });

  it("re-derives status when removing a reviewer from an InReview task", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "InReview" }));
    vi.mocked(prisma.taskReviewer.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u2", decision: "Approved" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Done" }),
    ]);

    await removeTaskReviewer("t1", "u4");

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Done" },
      select: { id: true },
    });
  });
});

describe("applyReviewDecision", () => {
  it("completes the task when every reviewer approves and every assignee is done", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "InReview" }));
    vi.mocked(prisma.taskReviewer.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Approved" }),
      mockTaskReviewer({ reviewer_user_id: "u2", decision: "Approved" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Done" }),
    ]);

    const result = await applyReviewDecision({
      taskId: "t1",
      reviewerUserId: "u1",
      decision: "Approved",
    });

    expect(result).toEqual({ taskStatus: "Done" });
    expect(prisma.taskReviewer.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Done" },
      select: { id: true },
    });
  });

  it("reopens the task and resets reviewers and assignees on rejection", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "InReview" }));
    vi.mocked(prisma.taskReviewer.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Rejected" }),
      mockTaskReviewer({ reviewer_user_id: "u2", decision: "Approved" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Done" }),
    ]);

    const result = await applyReviewDecision({
      taskId: "t1",
      reviewerUserId: "u1",
      decision: "Rejected",
    });

    expect(result).toEqual({ taskStatus: "Pending" });
    expect(prisma.taskReviewer.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.taskReviewer.updateMany).toHaveBeenLastCalledWith({
      where: { task_id: "t1" },
      data: { decision: "Pending", reviewed_at: null },
    });
    expect(prisma.taskAssignment.updateMany).toHaveBeenCalledWith({
      where: { task_id: "t1" },
      data: { status: "Todo" },
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Pending" },
      select: { id: true },
    });
  });

  it("leaves the task in review when reviewers disagree (pending)", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "InReview" }));
    vi.mocked(prisma.taskReviewer.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Approved" }),
      mockTaskReviewer({ reviewer_user_id: "u2", decision: "Pending" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Done" }),
    ]);

    const result = await applyReviewDecision({
      taskId: "t1",
      reviewerUserId: "u1",
      decision: "Approved",
    });

    expect(result).toEqual({ taskStatus: "InReview" });
    expect(prisma.taskReviewer.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "InReview" },
      select: { id: true },
    });
  });

  it("rejects a decision on a task that is not InReview", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "Pending" }));

    await expect(
      applyReviewDecision({ taskId: "t1", reviewerUserId: "u1", decision: "Approved" }),
    ).rejects.toThrow("Only tasks in review can be reviewed");
    expect(prisma.taskReviewer.updateMany).not.toHaveBeenCalled();
  });
});

describe("deriveTaskStatus", () => {
  it("derives status from assignee submissions and reviewer decisions", () => {
    expect(deriveTaskStatus([], [])).toBe("Pending");
    expect(deriveTaskStatus([], ["Pending"])).toBe("Pending");
    expect(deriveTaskStatus(["Done", "Done"], ["Approved", "Approved"])).toBe("Done");
    expect(deriveTaskStatus(["Done", "Done"], ["Approved", "Rejected"])).toBe("Pending");
    expect(deriveTaskStatus(["Done", "Done"], ["Approved", "Pending"])).toBe("InReview");
    expect(deriveTaskStatus(["Done", "Todo"], ["Approved", "Approved"])).toBe("Pending");
  });
});
