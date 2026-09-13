import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCaseAccessContext } from "@/features/cases/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { NotificationType, ReviewDecision, Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";

import {
  addTaskReviewerAction,
  createTaskAction,
  deleteTaskAction,
  getTaskDetailRowByIdAction,
  removeTaskReviewerAction,
  reviewTaskAction,
  submitTaskAction,
  updateTaskAction,
} from "../actions";
import {
  addTaskReviewer,
  applyReviewDecision,
  createTask,
  deleteTask,
  removeTaskReviewer,
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
  taskAssignments: [] as { user_id: string; user: { name: string }; status: "Todo" }[],
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

  it("dispatches TaskAssigned to the initial assignees on creation", async () => {
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

    expect(dispatchNotifications).toHaveBeenCalledTimes(1);
    const [payload, actorUserId] = vi.mocked(dispatchNotifications).mock.calls[0];
    expect(payload.type).toBe(NotificationType.TaskAssigned);
    expect(payload.userIds).toEqual([uuid]);
    expect(actorUserId).toBe("u2");
    expect(payload.actionUrl).toBe(`/case/${uuid}`);
    expect(payload.caseId).toBe(uuid);
    expect(payload.taskId).toBe("t1");
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
      taskAssignments: [{ user_id: assignee1, user: { name: "n2" }, status: "Todo" as const }],
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

  it("excludes a new assignee who is already a reviewer", async () => {
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      taskAssignments: [{ user_id: assignee1, user: { name: "n2" }, status: "Todo" as const }],
      taskReviewers: [
        { id: "tr2", reviewer_user_id: assignee2, decision: "Pending" as const, reviewed_at: null },
      ],
    });

    await updateTaskAction({
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      assignee_ids: [assignee1, assignee2],
    });
    await flushAfterCallbacks();

    expect(dispatchNotifications).not.toHaveBeenCalled();
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
  taskAssignments: [{ user_id: "u2", user: { name: "n2" }, status: "Todo" as const }],
};

describe("submitTaskAction", () => {
  it("returns a forbidden envelope when the caller is not an assignee", async () => {
    vi.mocked(getTaskById).mockResolvedValue(taskRecord);
    expect(await submitTaskAction({ taskId: uuid, status: "Done" })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
  });

  it("submits a todo task the caller is assigned to", async () => {
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
    vi.mocked(setAssignmentStatus).mockResolvedValue({ taskStatus: "InReview" });

    const result = await submitTaskAction({ taskId: uuid, status: "Done" });
    expect(result).toEqual({ success: true, data: { taskStatus: "InReview" } });
    await flushAfterCallbacks();
    expect(setAssignmentStatus).toHaveBeenCalledWith(uuid, "u2", "Done");
  });
});

describe("reviewTaskAction", () => {
  it("returns a forbidden envelope when the caller is not a reviewer", async () => {
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      status: "InReview" as const,
      taskReviewers: [],
    });
    expect(await reviewTaskAction({ taskId: uuid, decision: "Approved" })).toEqual({
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
      status: "InReview" as const,
      taskReviewers: [
        { id: "tr1", reviewer_user_id: "u2", decision: "Pending", reviewed_at: null },
      ],
    });
    vi.mocked(applyReviewDecision).mockResolvedValue({ taskStatus: "Done" });

    const result = await reviewTaskAction({ taskId: uuid, decision: "Approved" });
    expect(result).toEqual({ success: true, data: { taskStatus: "Done" } });
    expect(applyReviewDecision).toHaveBeenCalledWith({
      taskId: uuid,
      reviewerUserId: "u2",
      decision: "Approved",
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

  it("returns a conflict envelope when the reviewer is already an assignee", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      taskAssignments: [{ user_id: uuid, user: { name: "n" }, status: "Todo" as const }],
      taskReviewers: [],
    });

    const result = await addTaskReviewerAction({ taskId: uuid, reviewerUserId: uuid });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Assignee and reviewer must be distinct",
        description:
          "A user cannot be both assignee and reviewer on the same task. Remove the user from assignees first.",
      },
    });
    expect(addTaskReviewer).not.toHaveBeenCalled();
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
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      created_by_user_id: "u2",
      taskReviewers: [
        { id: "tr1", reviewer_user_id: uuid2, decision: "Pending" as const, reviewed_at: null },
        { id: "tr2", reviewer_user_id: uuid, decision: "Pending" as const, reviewed_at: null },
      ],
    });
    vi.mocked(removeTaskReviewer).mockResolvedValue({ id: uuid });

    const result = await removeTaskReviewerAction({ taskId: uuid, reviewerUserId: uuid2 });
    expect(result).toEqual({ success: true });
    expect(removeTaskReviewer).toHaveBeenCalledWith(uuid, uuid2);
  });
});

describe("updateTaskAction lifecycle lock", () => {
  it("rejects all metadata changes on a Done task", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, status: "Done" as const });

    expect(
      await updateTaskAction({
        taskId: uuid,
        title: "Renamed",
        description: undefined,
      }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Task locked",
        description:
          "A completed task is locked. Add a reviewer to reopen it before making changes.",
      },
    });
  });

  it("rejects title changes by a non-creator on a Done task", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, status: "Done" as const });

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
        title: "Task locked",
        description:
          "A completed task is locked. Add a reviewer to reopen it before making changes.",
      },
    });
  });

  it("rejects all changes on a Done task even when assignee_ids are unchanged", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      status: "Done" as const,
      taskAssignments: [{ user_id: uuid, user: { name: "n" }, status: "Todo" as const }],
    });

    const result = await updateTaskAction({
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      assignee_ids: [uuid],
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Task locked",
        description:
          "A completed task is locked. Add a reviewer to reopen it before making changes.",
      },
    });
  });

  it("rejects creator edits on a Done task", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({ ...taskRecord, status: "Done" as const });

    const result = await updateTaskAction({
      taskId: uuid,
      title: "Renamed",
      description: undefined,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Task locked",
        description:
          "A completed task is locked. Add a reviewer to reopen it before making changes.",
      },
    });
  });
});
