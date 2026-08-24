import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { getDocumentFilePathsByTaskId } from "@/features/documents/queries";
import { prisma } from "@/lib/prisma";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import {
  addTaskReviewer,
  applyReviewDecision,
  cancelTask,
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
    taskReviewer: { updateMany: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    taskAssignment: { updateMany: vi.fn(), findMany: vi.fn() },
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
  task: typeof prisma.task;
  taskReviewer: typeof prisma.taskReviewer;
  taskAssignment: typeof prisma.taskAssignment;
  caseAssignment: typeof prisma.caseAssignment;
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
  status: "Pending" as const,
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.caseAssignment.findMany).mockResolvedValue([]);
  transactionMock.mockImplementation((fn) => fn(tx));
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
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Pending" }),
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
          deleteMany: {},
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

  it("propagates error when updating nonexistent task", async () => {
    const error = new Error("Record not found");
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
    expect(getDocumentFilePathsByTaskId).toHaveBeenCalledWith("t1");
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

  it("aborts the task delete when an S3 document cannot be removed", async () => {
    const error = new Error("S3 unavailable");
    vi.mocked(getDocumentFilePathsByTaskId).mockResolvedValue(["tasks/t1/a.pdf"]);
    vi.mocked(deleteDocumentFiles).mockRejectedValue(error);

    await expect(deleteTask("t1")).rejects.toThrow(error);
    expect(prisma.task.delete).not.toHaveBeenCalled();
  });
});

describe("setAssignmentStatus", () => {
  it("submits the assignee and derives Submitted when every assignee has submitted", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Submitted" }),
      mockTaskAssignment({ user_id: "u3", status: "Submitted" }),
    ]);
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Pending" }),
    ]);

    const result = await setAssignmentStatus("t1", "u2", "Submitted");

    expect(result).toEqual({ taskStatus: "Submitted" });
    expect(prisma.taskAssignment.updateMany).toHaveBeenCalledWith({
      where: { task_id: "t1", user_id: "u2" },
      data: { status: "Submitted" },
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Submitted" },
      select: { id: true },
    });
  });

  it("reverts to Pending when an assignee un-submits", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "Submitted" }));
    vi.mocked(prisma.taskAssignment.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Submitted" }),
      mockTaskAssignment({ user_id: "u3", status: "Pending" }),
    ]);
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Pending" }),
    ]);

    const result = await setAssignmentStatus("t1", "u2", "Pending");

    expect(result).toEqual({ taskStatus: "Pending" });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Pending" },
      select: { id: true },
    });
  });

  it("throws when the task is Completed", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "Completed" }));

    await expect(setAssignmentStatus("t1", "u2", "Submitted")).rejects.toThrow(
      "Assignment submission is locked for this task",
    );
  });
});

describe("addTaskReviewer", () => {
  it("adds a reviewer and grants case membership", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskReviewer.upsert).mockResolvedValue(mockTaskReviewer());
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Pending" }),
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
  it("reopens a Completed task and resets reviewer decisions and assignee submissions to Pending", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "Completed" }));
    vi.mocked(prisma.taskReviewer.upsert).mockResolvedValue(mockTaskReviewer());
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Accepted" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Pending" }),
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
      data: { status: "Pending" },
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Pending" },
      select: { id: true },
    });
  });

  it("throws when the task is Cancelled", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "Cancelled" }));

    await expect(addTaskReviewer("t1", "u4")).rejects.toThrow(
      "Cannot add a reviewer to a cancelled task",
    );
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

  it("re-derives status when removing a reviewer from a Submitted task", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTask({ status: "Submitted" }));
    vi.mocked(prisma.taskReviewer.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u2", decision: "Accepted" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Submitted" }),
    ]);

    await removeTaskReviewer("t1", "u4");

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Completed" },
      select: { id: true },
    });
  });
});

describe("applyReviewDecision", () => {
  it("completes the task when every reviewer accepts and every assignee has submitted", async () => {
    vi.mocked(prisma.taskReviewer.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Accepted" }),
      mockTaskReviewer({ reviewer_user_id: "u2", decision: "Accepted" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Submitted" }),
    ]);

    const result = await applyReviewDecision({
      taskId: "t1",
      reviewerUserId: "u1",
      decision: "Accepted",
    });

    expect(result).toEqual({ taskStatus: "Completed" });
    expect(prisma.taskReviewer.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Completed" },
      select: { id: true },
    });
  });

  it("reopens the task and resets reviewers and assignees on rejection", async () => {
    vi.mocked(prisma.taskReviewer.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Rejected" }),
      mockTaskReviewer({ reviewer_user_id: "u2", decision: "Accepted" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Submitted" }),
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
      data: { status: "Pending" },
    });
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Pending" },
      select: { id: true },
    });
  });

  it("leaves the task submitted when reviewers disagree", async () => {
    vi.mocked(prisma.taskReviewer.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      mockTaskReviewer({ reviewer_user_id: "u1", decision: "Accepted" }),
      mockTaskReviewer({ reviewer_user_id: "u2", decision: "Pending" }),
    ]);
    vi.mocked(prisma.taskAssignment.findMany).mockResolvedValue([
      mockTaskAssignment({ status: "Submitted" }),
    ]);

    const result = await applyReviewDecision({
      taskId: "t1",
      reviewerUserId: "u2",
      decision: "Accepted",
    });

    expect(result).toEqual({ taskStatus: "Submitted" });
    expect(prisma.taskReviewer.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Submitted" },
      select: { id: true },
    });
  });
});

describe("cancelTask", () => {
  it("cancels a task", async () => {
    vi.mocked(prisma.task.update).mockResolvedValue(mockTask());

    const result = await cancelTask("t1");

    expect(result.id).toBe("t1");
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "Cancelled" },
      select: { id: true },
    });
  });
});

describe("deriveTaskStatus", () => {
  it("derives status from assignee submissions and reviewer decisions", () => {
    expect(deriveTaskStatus([], [])).toBe("Pending");
    expect(deriveTaskStatus([], ["Pending"])).toBe("Pending");
    expect(deriveTaskStatus(["Submitted", "Submitted"], ["Accepted", "Accepted"])).toBe(
      "Completed",
    );
    expect(deriveTaskStatus(["Submitted", "Submitted"], ["Accepted", "Rejected"])).toBe("Pending");
    expect(deriveTaskStatus(["Submitted", "Submitted"], ["Accepted", "Pending"])).toBe("Submitted");
    expect(deriveTaskStatus(["Submitted", "Pending"], ["Accepted", "Accepted"])).toBe("Pending");
  });
});
