import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCaseAccessContext } from "@/features/cases/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { NotificationType, ReviewDecision, Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { TaskCancelledError } from "@/lib/errors";

import {
  addTaskReviewerAction,
  createTaskAction,
  deleteTaskAction,
  getTaskDetailRowByIdAction,
  removeTaskReviewerAction,
  reviewTaskAction,
  setTaskStatusAction,
  submitTaskAction,
  updateTaskAction,
} from "../actions";
import {
  addTaskReviewer,
  applyReviewDecision,
  cancelTask,
  createTask,
  deleteTask,
  removeTaskReviewer,
  reopenTask,
  setAssignmentStatus,
  updateTask,
} from "../mutations";
import { getTaskAccessContext, getTaskById, getTaskDetailRowById } from "../queries";

async function flushAfterCallbacks(): Promise<void> {
  const server = (await import("next/server")) as unknown as {
    __flushAfterCallbacks: () => Promise<void>;
  };
  await server.__flushAfterCallbacks();
}

afterEach(async () => {
  await flushAfterCallbacks();
});

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u2", email: "e2", role: Role.Lawyer, name: "n2" }),
}));

vi.mock("@/features/cases/queries", () => ({
  getCaseAccessContext: vi.fn().mockResolvedValue({ assigned: false, own: false }),
}));

vi.mock("@/features/audit/mutations", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ count: 0 }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/server", () => {
  const afterCallbacks: Array<() => void | Promise<void>> = [];
  return {
    after: vi.fn((fn: () => void | Promise<void>) => {
      afterCallbacks.push(fn);
    }),
    __flushAfterCallbacks: () =>
      Promise.all(afterCallbacks.splice(0).map((fn) => Promise.resolve(fn()))),
  };
});

vi.mock("../queries", () => ({
  getActiveUsers: vi.fn(),
  getTaskAccessContext: vi.fn(),
  getTaskById: vi.fn(),
  getTaskDetailRowById: vi.fn(),
  getTaskReviewers: vi.fn().mockResolvedValue([]),
}));

vi.mock("../mutations", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  setAssignmentStatus: vi.fn(),
  applyReviewDecision: vi.fn(),
  addTaskReviewer: vi.fn(),
  removeTaskReviewer: vi.fn(),
  cancelTask: vi.fn(),
  reopenTask: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";
const uuid2 = "550e8400-e29b-41d4-a716-446655440001";

const taskRecord = {
  id: "t1",
  title: "Draft memo",
  description: null,
  status: "Pending" as const,
  case_id: uuid,
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  taskAssignments: [] as { user_id: string; user: { name: string }; status: "Pending" }[],
  taskReviewers: [] as {
    id: string;
    reviewer_user_id: string;
    decision: ReviewDecision;
    reviewed_at: Date | null;
  }[],
};

const taskRow = {
  id: "t1",
  title: "Draft memo",
  description: null,
  status: "Pending" as const,
  case_id: uuid,
  assignee_ids: [] as string[],
  reviewers: [] as {
    id: string;
    reviewer_user_id: string;
    name: string;
    decision: ReviewDecision;
    reviewed_at: Date | null;
  }[],
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  assignTo: [],
  created_by_user_id: "u1",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTaskAccessContext).mockResolvedValue({
    assigned: false,
    own: false,
    taskOnly: false,
  });
  vi.mocked(getTaskById).mockResolvedValue(taskRecord);
  vi.mocked(getTaskDetailRowById).mockResolvedValue(taskRow);
});

afterEach(() => {
  vi.mocked(requireAuth).mockResolvedValue({
    id: "u2",
    email: "e2",
    role: Role.Lawyer,
    name: "n2",
  });
});

describe("getTaskDetailRowByIdAction", () => {
  it("throws Forbidden when task read is denied", async () => {
    await expect(getTaskDetailRowByIdAction(uuid)).rejects.toThrow("Forbidden");
  });

  it("returns canUpdate=false for a Paralegal assigned to the case but not the task", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: false,
    });

    const result = await getTaskDetailRowByIdAction(uuid);

    expect(result).toEqual({
      row: taskRow,
      canUpdate: false,
      currentUserId: "u2",
      capabilities: {
        isCreator: false,
        isReviewer: false,
        canSubmit: false,
        canReview: false,
        canSetStatus: false,
        canManageReviewers: false,
        canEdit: false,
      },
    });
  });

  it("returns canUpdate=true for a Paralegal assigned to the specific task", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });

    const result = await getTaskDetailRowByIdAction(uuid);

    expect(result).toEqual({
      row: taskRow,
      canUpdate: true,
      currentUserId: "u2",
      capabilities: {
        isCreator: false,
        isReviewer: false,
        canSubmit: false,
        canReview: false,
        canSetStatus: false,
        canManageReviewers: false,
        canEdit: true,
      },
    });
  });
});

describe("createTaskAction", () => {
  it("returns a forbidden envelope when task create is denied on the parent case", async () => {
    const payload = {
      title: "Draft memo",
      description: undefined,
      case_id: uuid,
      assignee_ids: [uuid],
    };

    expect(await createTaskAction(payload)).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("creates a task without dispatching a notification", async () => {
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: false });
    vi.mocked(createTask).mockResolvedValue({ id: "t1" });

    const result = await createTaskAction({
      title: "Draft memo",
      description: undefined,
      case_id: uuid,
      assignee_ids: [uuid],
    });

    expect(result).toEqual({ success: true, data: { id: "t1" } });
    await flushAfterCallbacks();
    expect(dispatchNotifications).not.toHaveBeenCalled();
  });
});

describe("updateTaskAction", () => {
  it("returns a forbidden envelope when task update is denied", async () => {
    const payload = {
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      assignee_ids: undefined,
    };

    expect(await updateTaskAction(payload)).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("denies a Lawyer who is a case member but not attached to the task", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: false,
    });

    const result = await updateTaskAction({
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      assignee_ids: undefined,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("allows a Lawyer who is attached to the task (assignee/reviewer)", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(updateTask).mockResolvedValue({ id: uuid });

    const result = await updateTaskAction({
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      assignee_ids: undefined,
    });

    expect(result).toEqual({ success: true });
  });
});

describe("updateTaskAction notification split", () => {
  const assignee1 = uuid;
  const assignee2 = "550e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      taskAssignments: [{ user_id: assignee1, user: { name: "n2" }, status: "Pending" as const }],
    });
    vi.mocked(updateTask).mockResolvedValue({ id: uuid });
  });

  it("dispatches TaskAssigned only to the new assignee", async () => {
    await updateTaskAction({
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      assignee_ids: [assignee1, assignee2],
    });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const assigned = calls.find(([payload]) => payload.type === NotificationType.TaskAssigned);

    expect(calls).toHaveLength(1);
    expect(assigned?.[0].userIds).toEqual([assignee2]);
  });

  it("dispatches only TaskAssigned when only the assignee set changed", async () => {
    await updateTaskAction({
      taskId: uuid,
      title: "Draft memo",
      description: undefined,
      assignee_ids: [assignee1, assignee2],
    });
    await flushAfterCallbacks();

    const types = vi.mocked(dispatchNotifications).mock.calls.map(([payload]) => payload.type);
    expect(types).toEqual([NotificationType.TaskAssigned]);
  });
});

describe("deleteTaskAction", () => {
  it("returns a forbidden envelope when task delete is denied", async () => {
    expect(await deleteTaskAction({ taskId: uuid })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("denies a Lawyer who is a case member but not the task creator", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });

    expect(await deleteTaskAction({ taskId: uuid })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("allows the task creator to delete", async () => {
    vi.mocked(getTaskById).mockResolvedValue(taskRecord);
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(deleteTask).mockResolvedValue(taskRecord);

    expect(await deleteTaskAction({ taskId: uuid })).toEqual({ success: true });
  });

  it("returns a failure status when the underlying delete throws", async () => {
    vi.mocked(getTaskById).mockResolvedValue(taskRecord);
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(deleteTask).mockRejectedValue(new Error("S3 unavailable"));

    expect(await deleteTaskAction({ taskId: uuid })).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to delete task",
        description: "Something went wrong on our end. Please try again.",
      },
    });
  });
});

const assigneeRecord = {
  ...taskRecord,
  taskAssignments: [{ user_id: "u2", user: { name: "n2" }, status: "Pending" as const }],
};

describe("submitTaskAction", () => {
  it("returns a forbidden envelope when the caller is not an assignee", async () => {
    vi.mocked(getTaskById).mockResolvedValue(taskRecord);
    expect(await submitTaskAction({ taskId: uuid, status: "Submitted" })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("submits a pending task the caller is assigned to", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({
      ...assigneeRecord,
      status: "Pending" as const,
      taskReviewers: [
        { id: "tr1", reviewer_user_id: "u2", decision: "Pending", reviewed_at: null },
      ],
    });
    vi.mocked(setAssignmentStatus).mockResolvedValue({ taskStatus: "Submitted" });

    const result = await submitTaskAction({ taskId: uuid, status: "Submitted" });
    expect(result).toEqual({ success: true });
    await flushAfterCallbacks();
    expect(setAssignmentStatus).toHaveBeenCalledWith(uuid, "u2", "Submitted");
  });
});

describe("reviewTaskAction", () => {
  it("returns a forbidden envelope when the caller is not a reviewer", async () => {
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      status: "Submitted" as const,
      taskReviewers: [],
    });
    expect(await reviewTaskAction({ taskId: uuid, decision: "Accepted" })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("records a reviewer's decision", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      status: "Submitted" as const,
      taskReviewers: [
        { id: "tr1", reviewer_user_id: "u2", decision: "Pending", reviewed_at: null },
      ],
    });
    vi.mocked(applyReviewDecision).mockResolvedValue({ taskStatus: "Completed" });

    const result = await reviewTaskAction({ taskId: uuid, decision: "Accepted" });
    expect(result).toEqual({ success: true });
    expect(applyReviewDecision).toHaveBeenCalledWith({
      taskId: uuid,
      reviewerUserId: "u2",
      decision: "Accepted",
    });
  });
});

describe("addTaskReviewerAction", () => {
  it("returns a forbidden envelope for a stranger", async () => {
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      taskReviewers: [],
    });
    expect(await addTaskReviewerAction({ taskId: uuid, reviewerUserId: uuid })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("allows an existing reviewer to add another", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      taskReviewers: [
        { id: "tr1", reviewer_user_id: "u2", decision: "Pending", reviewed_at: null },
      ],
    });
    vi.mocked(addTaskReviewer).mockResolvedValue({ id: uuid });

    const result = await addTaskReviewerAction({ taskId: uuid, reviewerUserId: uuid });
    expect(result).toEqual({ success: true });
    expect(addTaskReviewer).toHaveBeenCalledWith(uuid, uuid);
  });
});

describe("removeTaskReviewerAction", () => {
  it("returns a forbidden envelope for a non-creator", async () => {
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, created_by_user_id: "u1" });
    expect(await removeTaskReviewerAction({ taskId: uuid, reviewerUserId: uuid2 })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("rejects removing the task creator", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: uuid,
      email: "e2",
      role: Role.Lawyer,
      name: "n2",
    });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, created_by_user_id: uuid });
    expect(await removeTaskReviewerAction({ taskId: uuid, reviewerUserId: uuid })).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Not allowed",
        description: "Cannot remove the task creator as a reviewer.",
      },
    });
  });

  it("allows the creator to remove a reviewer", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, created_by_user_id: "u2" });
    vi.mocked(removeTaskReviewer).mockResolvedValue({ id: uuid });

    const result = await removeTaskReviewerAction({ taskId: uuid, reviewerUserId: uuid2 });
    expect(result).toEqual({ success: true });
    expect(removeTaskReviewer).toHaveBeenCalledWith(uuid, uuid2);
  });
});

describe("setTaskStatusAction", () => {
  const creatorAccess = { assigned: true, own: true, taskOnly: true };
  const nonCreatorAccess = { assigned: true, own: false, taskOnly: true };

  it("returns a forbidden envelope for a non-creator", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue(nonCreatorAccess);
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, created_by_user_id: "u1" });
    expect(await setTaskStatusAction({ taskId: uuid, status: "Cancelled" })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("cancels a task for its creator", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue(creatorAccess);
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, created_by_user_id: "u2" });
    vi.mocked(cancelTask).mockResolvedValue({ id: uuid });

    const result = await setTaskStatusAction({ taskId: uuid, status: "Cancelled" });
    expect(result).toEqual({ success: true });
    expect(cancelTask).toHaveBeenCalledWith(uuid);
    expect(reopenTask).not.toHaveBeenCalled();
  });

  it("allows the creator to cancel a Completed task", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue(creatorAccess);
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      status: "Completed" as const,
      created_by_user_id: "u2",
    });
    vi.mocked(cancelTask).mockResolvedValue({ id: uuid });

    const result = await setTaskStatusAction({ taskId: uuid, status: "Cancelled" });
    expect(result).toEqual({ success: true });
    expect(cancelTask).toHaveBeenCalledWith(uuid);
  });

  it("reopens a Submitted task for its creator, resetting decisions and submissions", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue(creatorAccess);
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      status: "Submitted" as const,
      created_by_user_id: "u2",
    });
    vi.mocked(reopenTask).mockResolvedValue({ id: uuid, reopened: true });

    const result = await setTaskStatusAction({ taskId: uuid, status: "Pending" });
    expect(result).toEqual({ success: true });
    expect(reopenTask).toHaveBeenCalledWith(uuid);
    expect(cancelTask).not.toHaveBeenCalled();
  });

  it("skips the audit entry when reopening is a server-side no-op", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue(creatorAccess);
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, created_by_user_id: "u2" });
    vi.mocked(reopenTask).mockResolvedValue({ id: uuid, reopened: false });

    const result = await setTaskStatusAction({ taskId: uuid, status: "Pending" });
    expect(result).toEqual({ success: true });
    expect(reopenTask).toHaveBeenCalledWith(uuid);
    expect(cancelTask).not.toHaveBeenCalled();
  });

  it("returns a conflict envelope when cancelling an already-cancelled task", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue(creatorAccess);
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      created_by_user_id: "u2",
    });
    vi.mocked(cancelTask).mockRejectedValue(new TaskCancelledError());

    const result = await setTaskStatusAction({ taskId: uuid, status: "Cancelled" });
    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Task cancelled",
        description: "This task has already been cancelled.",
      },
    });
  });

  it("returns a conflict envelope when reopening a cancelled task", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue(creatorAccess);
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      created_by_user_id: "u2",
    });
    vi.mocked(reopenTask).mockRejectedValue(new TaskCancelledError());

    const result = await setTaskStatusAction({ taskId: uuid, status: "Pending" });
    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Task cancelled",
        description: "A cancelled task cannot be reopened.",
      },
    });
  });

  it("returns a validation envelope for an unsupported status", async () => {
    const result = await setTaskStatusAction({
      taskId: uuid,
      status: "Submitted" as never,
    });
    expect(result).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid task data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });
});

describe("updateTaskAction lifecycle lock", () => {
  it("allows a non-creator with update access to edit a Completed task's details", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, status: "Completed" as const });
    vi.mocked(updateTask).mockResolvedValue({ id: uuid });

    expect(
      await updateTaskAction({
        taskId: uuid,
        title: "Renamed",
        description: undefined,
      }),
    ).toEqual({ success: true });
  });

  it("refuses assignee changes by a non-creator even with update access", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, status: "Completed" as const });

    expect(
      await updateTaskAction({
        taskId: uuid,
        title: "Renamed",
        description: undefined,
        assignee_ids: [uuid],
      }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Not allowed",
        description: "Only the task creator can change assignees.",
      },
    });
  });

  it("lets a non-creator edit details when assignee_ids are unchanged (modal always sends them)", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, status: "Completed" as const });
    vi.mocked(updateTask).mockResolvedValue({ id: uuid });

    const result = await updateTaskAction({
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      assignee_ids: [],
    });

    expect(result).toEqual({ success: true });
    expect(updateTask).toHaveBeenCalledWith(uuid, { title: "Renamed", description: undefined });
    expect(vi.mocked(updateTask).mock.calls[0][1]).not.toHaveProperty("assignee_ids");
  });

  it("allows the creator to edit and reopen a Completed task", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, status: "Completed" as const });
    vi.mocked(updateTask).mockResolvedValue({ id: uuid });

    const result = await updateTaskAction({
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      assignee_ids: [uuid],
    });

    expect(result).toEqual({ success: true });
    expect(updateTask).toHaveBeenCalled();
  });
});
