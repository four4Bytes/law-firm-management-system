import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCaseAccessContext } from "@/features/cases/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { NotificationType, Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { FORBIDDEN_MESSAGE } from "@/lib/rbac";

import {
  createTaskAction,
  deleteTaskAction,
  getTaskDetailRowByIdAction,
  updateTaskAction,
} from "../actions";
import { createTask, updateTask } from "../mutations";
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
  createAuditLog: vi.fn().mockResolvedValue(undefined),
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
}));

vi.mock("../mutations", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const taskRecord = {
  id: "t1",
  title: "Draft memo",
  description: null,
  status: "Pending" as const,
  case_id: uuid,
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  taskAssignments: [] as { user_id: string; user: { name: string } }[],
};

const taskRow = {
  id: "t1",
  title: "Draft memo",
  description: null,
  status: "Pending" as const,
  case_id: uuid,
  assignee_ids: [] as string[],
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  assignTo: "",
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

    expect(result).toEqual({ row: taskRow, canUpdate: false });
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

    expect(result).toEqual({ row: taskRow, canUpdate: true });
  });
});

describe("createTaskAction", () => {
  it("returns FORBIDDEN_MESSAGE when task create is denied on the parent case", async () => {
    const payload = {
      title: "Draft memo",
      description: undefined,
      status: "Pending" as const,
      case_id: uuid,
      assignee_ids: undefined,
    };

    expect(await createTaskAction(payload)).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });

  it("creates a task without dispatching a notification", async () => {
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: false });
    vi.mocked(createTask).mockResolvedValue({ id: "t1" });

    const result = await createTaskAction({
      title: "Draft memo",
      description: undefined,
      status: "Pending" as const,
      case_id: uuid,
      assignee_ids: [uuid],
    });

    expect(result).toEqual({ success: true, data: { id: "t1" } });
    await flushAfterCallbacks();
    expect(dispatchNotifications).not.toHaveBeenCalled();
  });
});

describe("updateTaskAction", () => {
  it("returns FORBIDDEN_MESSAGE when task update is denied", async () => {
    const payload = {
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      status: "Ongoing" as const,
      assignee_ids: undefined,
    };

    expect(await updateTaskAction(payload)).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });
});

describe("updateTaskAction notification split", () => {
  const assignee1 = uuid;
  const assignee2 = "550e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({
      ...taskRecord,
      taskAssignments: [{ user_id: assignee1, user: { name: "n2" } }],
    });
    vi.mocked(updateTask).mockResolvedValue({ id: uuid });
  });

  it("dispatches TaskAssigned only to the new assignee", async () => {
    await updateTaskAction({
      taskId: uuid,
      title: "Renamed",
      description: undefined,
      status: "Ongoing" as const,
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
      status: "Pending" as const,
      assignee_ids: [assignee1, assignee2],
    });
    await flushAfterCallbacks();

    const types = vi.mocked(dispatchNotifications).mock.calls.map(([payload]) => payload.type);
    expect(types).toEqual([NotificationType.TaskAssigned]);
  });
});

describe("deleteTaskAction", () => {
  it("returns FORBIDDEN_MESSAGE when task delete is denied", async () => {
    expect(await deleteTaskAction({ taskId: uuid })).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });
});
