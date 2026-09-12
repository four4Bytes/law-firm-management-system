import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dispatchNotifications } from "@/features/notifications/dispatch";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { getActiveUserIds } from "@/features/users/queries";
import { Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";

import {
  createSubtaskAction,
  deleteSubtaskAction,
  getSubtasksByTaskAction,
  setSubtaskStatusAction,
  updateSubtaskAction,
} from "../actions";
import { createSubtask, deleteSubtask, setSubtaskStatus, updateSubtask } from "../mutations";
import { getSubtaskById, getSubtaskProgress, getSubtasksByTaskId } from "../queries";

async function flushAfterCallbacks(): Promise<void> {
  const server = (await import("next/server")) as unknown as {
    __flushAfterCallbacks: () => Promise<void>;
  };
  await server.__flushAfterCallbacks();
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await flushAfterCallbacks();
});

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e1", role: Role.Lawyer, name: "n1" }),
}));

vi.mock("@/features/tasks/queries", () => ({
  getTaskAccessContext: vi.fn(),
  getTaskById: vi.fn(),
}));

vi.mock("@/features/users/queries", () => ({
  getActiveUserIds: vi.fn(),
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
  getSubtaskById: vi.fn(),
  getSubtaskProgress: vi.fn(),
  getSubtaskRowById: vi.fn(),
  getSubtasksByTaskId: vi.fn(),
}));

vi.mock("../mutations", () => ({
  createSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
  setSubtaskStatus: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";
const taskId = "550e8400-e29b-41d4-a716-446655440001";
const subtaskId = "550e8400-e29b-41d4-a716-446655440002";
const caseId = "550e8400-e29b-41d4-a716-446655440003";
const assigneeId = "550e8400-e29b-41d4-a716-446655440004";

const parentTask = {
  id: taskId,
  title: "Parent",
  description: null,
  status: "Pending" as const,
  case_id: caseId,
  created_by_user_id: "u9",
  created_at: new Date("2026-09-01"),
  updated_at: new Date("2026-09-01"),
  taskAssignments: [] as { user_id: string; user: { name: string }; status: "Pending" }[],
  taskReviewers: [] as {
    id: string;
    reviewer_user_id: string;
    decision: "Pending";
    reviewed_at: null;
  }[],
};

const subtaskRecord = {
  id: subtaskId,
  task_id: taskId,
  title: "Sub",
  description: null,
  status: "Pending" as const,
  priority: null,
  due_date: null,
  reminder_days: null,
  created_by_user_id: "u1",
  created_at: new Date("2026-09-01"),
  updated_at: new Date("2026-09-01"),
  task: { case_id: caseId, status: "Pending" as const },
  assignments: [{ user_id: assigneeId, user: { name: "Maria" } }],
};

describe("getSubtasksByTaskAction", () => {
  it("returns rows and progress for authorized readers", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: true, own: false });
    vi.mocked(getSubtasksByTaskId).mockResolvedValue([]);
    vi.mocked(getSubtaskProgress).mockResolvedValue({ total: 0, completed: 0, percent: 0 });

    const result = await getSubtasksByTaskAction(taskId);

    expect(result).toEqual({ rows: [], progress: { total: 0, completed: 0, percent: 0 } });
  });

  it("throws for readers without task access", async () => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: false, own: false });
    vi.mocked(requireAuth).mockResolvedValueOnce({
      id: "u5",
      email: "e5",
      role: Role.ProcessServer,
      name: "n5",
    });

    await expect(getSubtasksByTaskAction("t1")).rejects.toThrow();
  });
});

describe("createSubtaskAction", () => {
  it("creates a subtask and notifies assignees", async () => {
    vi.mocked(getTaskById).mockResolvedValue(parentTask);
    vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(getActiveUserIds).mockResolvedValue(["u2"]);
    vi.mocked(createSubtask).mockResolvedValue({ id: subtaskId });

    const result = await createSubtaskAction({
      title: "Collect documents",
      task_id: taskId,
      assignee_ids: [assigneeId],
    });

    expect(result).toEqual({ success: true, data: { id: subtaskId } });
    await flushAfterCallbacks();
    expect(dispatchNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [assigneeId], subtaskId }),
      "u1",
    );
  });

  it("rejects creation without permission", async () => {
    vi.mocked(getTaskById).mockResolvedValue(parentTask);
    vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: false, own: false });
    vi.mocked(requireAuth).mockResolvedValueOnce({
      id: "u5",
      email: "e5",
      role: Role.ProcessServer,
      name: "n5",
    });

    const result = await createSubtaskAction({
      title: "Collect documents",
      task_id: taskId,
      assignee_ids: [uuid],
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("forbidden");
    expect(createSubtask).not.toHaveBeenCalled();
  });

  it("returns not-found for a missing parent task", async () => {
    vi.mocked(getTaskById).mockResolvedValue(null);

    const result = await createSubtaskAction({
      title: "Collect documents",
      task_id: uuid,
      assignee_ids: [uuid],
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("not_found");
  });

  it("rejects inactive or unknown assignees", async () => {
    vi.mocked(getTaskById).mockResolvedValue(parentTask);
    vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(getActiveUserIds).mockResolvedValue([]);

    const result = await createSubtaskAction({
      title: "Collect documents",
      task_id: taskId,
      assignee_ids: [uuid],
    });

    expect(result.success).toBe(false);
    expect(createSubtask).not.toHaveBeenCalled();
  });
});

describe("updateSubtaskAction", () => {
  it("updates and notifies on status change", async () => {
    vi.mocked(getSubtaskById).mockResolvedValue(subtaskRecord);
    vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(updateSubtask).mockResolvedValue({ id: subtaskId, task_id: taskId });

    const result = await updateSubtaskAction({
      subtaskId,
      title: "Sub",
      status: "Completed",
      assignee_ids: [assigneeId],
    });

    expect(result).toEqual({ success: true });
    await flushAfterCallbacks();
    expect(dispatchNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TaskStatusChanged" }),
      "u1",
    );
  });

  it("forbids assignee changes for non-creators", async () => {
    vi.mocked(getSubtaskById).mockResolvedValue(subtaskRecord);
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });

    const result = await updateSubtaskAction({
      subtaskId,
      title: "Sub",
      status: "Pending",
      assignee_ids: [uuid],
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("forbidden");
    expect(updateSubtask).not.toHaveBeenCalled();
  });
});

describe("deleteSubtaskAction", () => {
  it("deletes with delete permission", async () => {
    vi.mocked(getSubtaskById).mockResolvedValue(subtaskRecord);
    vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(deleteSubtask).mockResolvedValue({ id: subtaskId, task_id: taskId });

    const result = await deleteSubtaskAction({ subtaskId });

    expect(result).toEqual({ success: true });
  });

  it("forbids deletion without permission", async () => {
    vi.mocked(getSubtaskById).mockResolvedValue(subtaskRecord);
    vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: true, own: false });
    vi.mocked(requireAuth).mockResolvedValueOnce({
      id: "u5",
      email: "e5",
      role: Role.ProcessServer,
      name: "n5",
    });

    const result = await deleteSubtaskAction({ subtaskId });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("forbidden");
    expect(deleteSubtask).not.toHaveBeenCalled();
  });
});

describe("setSubtaskStatusAction", () => {
  it("sets status for authorized users", async () => {
    vi.mocked(getSubtaskById).mockResolvedValue(subtaskRecord);
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(setSubtaskStatus).mockResolvedValue({ id: subtaskId, task_id: taskId });

    const result = await setSubtaskStatusAction({ subtaskId, status: "Completed" });

    expect(result).toEqual({ success: true });
  });

  it("short-circuits unchanged statuses", async () => {
    vi.mocked(getSubtaskById).mockResolvedValue(subtaskRecord);
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });

    const result = await setSubtaskStatusAction({ subtaskId, status: "Pending" });

    expect(result).toEqual({ success: true });
    expect(setSubtaskStatus).not.toHaveBeenCalled();
  });
});
