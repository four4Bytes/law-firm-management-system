import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logAudit } from "@/features/audit/mutations";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { Role, SubtaskStatus } from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";
import type { AuthenticatedUser } from "@/lib/security/auth-guards";
import type { AccessContext, Permission } from "@/lib/security/rbac";
import { mockSessionUser } from "@/test-utils/fixtures";
import { setupAuth } from "@/test-utils/test-setup";

import {
  completeSubtaskAction,
  createSubtaskAction,
  deleteSubtaskAction,
  getSubtasksByTaskAction,
  updateSubtaskAction,
} from "../actions";
import { completeSubtask, createSubtask, deleteSubtask, updateSubtask } from "../mutations";
import { getSubtaskDetailRowById, getSubtasksByTaskId, type SubtaskRow } from "../queries";

async function flushAfterCallbacks(): Promise<void> {
  const server = (await import("next/server")) as unknown as {
    __flushAfterCallbacks: () => Promise<void>;
  };
  await server.__flushAfterCallbacks();
}

vi.mock("@/lib/security/auth-guards", async () => {
  const { can } = await import("@/lib/security/rbac");
  const { ForbiddenError } = await import("@/lib/security/errors");
  return {
    requireAuth: vi.fn(),
    requirePermission: vi.fn(),
    assertRecordPermission: vi.fn(
      (session: AuthenticatedUser, permission: Permission, context: AccessContext) => {
        if (!can(session.role, permission, context)) throw new ForbiddenError();
        return context;
      },
    ),
  };
});

vi.mock("@/features/tasks/queries", () => ({
  getTaskById: vi.fn(),
  getTaskAccessContext: vi.fn(),
}));

vi.mock("../queries", () => ({
  getSubtasksByTaskId: vi.fn(),
  getSubtaskDetailRowById: vi.fn(),
}));

vi.mock("../mutations", () => ({
  createSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  completeSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
}));

vi.mock("@/features/audit/mutations", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/infra/prisma", () => ({
  prisma: { task: { update: vi.fn() } },
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

const taskId = "550e8400-e29b-41d4-a716-446655440000";
const assigneeId = "550e8400-e29b-41d4-a716-446655440001";
const caseId = "550e8400-e29b-41d4-a716-446655440002";
const subtaskId = "550e8400-e29b-41d4-a716-446655440003";
const dueDate = new Date("2026-12-01T09:00:00+08:00");

const sessionAdmin = mockSessionUser({ id: "u2", email: "e2", role: Role.Admin, name: "n2" });

const parentTask = {
  id: "t1",
  title: "Parent task",
  description: null,
  status: "Pending" as const,
  case_id: caseId,
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  taskAssignments: [] as { user_id: string; user: { name: string }; status: "Todo" }[],
  taskReviewers: [] as {
    id: string;
    reviewer_user_id: string;
    decision: "Pending";
    reviewed_at: Date | null;
  }[],
};

const detailRow = {
  id: "st1",
  task_id: "t1",
  title: "Subtask",
  description: null,
  status: SubtaskStatus.Pending,
  due_date: dueDate,
  created_by_user_id: "u1",
  created_at: new Date("2026-10-01T09:00:00+08:00"),
  updated_at: new Date("2026-10-01T09:00:00+08:00"),
  assignTo: [{ id: "u1", name: "Alice" }],
  assignee_ids: ["u1"],
  case_id: caseId,
};

const forbiddenEnvelope = {
  success: false,
  error: {
    code: "forbidden",
    title: "Access denied",
    description: "You don't have permission to perform this action.",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: true, own: true, taskOnly: true });
  vi.mocked(getTaskById).mockResolvedValue(parentTask);
  vi.mocked(getSubtaskDetailRowById).mockResolvedValue(detailRow);
  vi.mocked(getSubtasksByTaskId).mockResolvedValue([]);
  vi.mocked(createSubtask).mockResolvedValue({ id: "st1" });
  vi.mocked(updateSubtask).mockResolvedValue(undefined);
  vi.mocked(completeSubtask).mockResolvedValue(undefined);
  vi.mocked(deleteSubtask).mockResolvedValue(undefined);
});

afterEach(async () => {
  await flushAfterCallbacks();
  setupAuth(sessionAdmin);
});

describe("createSubtaskAction", () => {
  it("returns invalid envelope for blank title (TC-081)", async () => {
    setupAuth(sessionAdmin);
    const res = await createSubtaskAction({
      taskId,
      title: "   ",
      due_date: dueDate,
      assignee_ids: [assigneeId],
    });
    expect(res).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid subtask data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("creates a subtask, audits, and revalidates (TC-082)", async () => {
    setupAuth(sessionAdmin);
    const res = await createSubtaskAction({
      taskId,
      title: "Subtask",
      due_date: dueDate,
      assignee_ids: [assigneeId],
    });
    expect(res).toEqual({ success: true, data: { id: "st1" } });
    expect(createSubtask).toHaveBeenCalledWith(
      expect.objectContaining({ taskId, title: "Subtask", createdBy: "u2" }),
    );
    await flushAfterCallbacks();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "subtask.created",
        entityType: "Case",
        entityId: caseId,
      }),
    );
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/case/${caseId}`);
  });

  it("returns not found when the parent task is missing", async () => {
    setupAuth(sessionAdmin);
    vi.mocked(getTaskById).mockResolvedValue(null);
    const res = await createSubtaskAction({
      taskId,
      title: "Subtask",
      due_date: dueDate,
      assignee_ids: [assigneeId],
    });
    expect(res).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Task not found",
        description: "The task may have been deleted by another user.",
      },
    });
  });

  it("returns conflict without creating when the parent task is Done", async () => {
    setupAuth(sessionAdmin);
    vi.mocked(getTaskById).mockResolvedValue({ ...parentTask, status: "Done" as const });
    const res = await createSubtaskAction({
      taskId,
      title: "Subtask",
      due_date: dueDate,
      assignee_ids: [assigneeId],
    });
    expect(res).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Cannot add subtask",
        description: "The parent task is completed. Reopen the task first.",
      },
    });
    expect(createSubtask).not.toHaveBeenCalled();
  });

  it.each([
    { role: Role.Admin, access: { assigned: false, own: false, taskOnly: false }, allowed: true },
    {
      role: Role.Lawyer,
      access: { assigned: true, own: false, taskOnly: true },
      allowed: true,
    },
    {
      role: Role.Lawyer,
      access: { assigned: true, own: false, taskOnly: false },
      allowed: false,
    },
    {
      role: Role.Paralegal,
      access: { assigned: true, own: false, taskOnly: true },
      allowed: true,
    },
    {
      role: Role.Paralegal,
      access: { assigned: true, own: false, taskOnly: false },
      allowed: false,
    },
    {
      role: Role.ProcessServer,
      access: { assigned: true, own: false, taskOnly: true },
      allowed: true,
    },
    {
      role: Role.ProcessServer,
      access: { assigned: true, own: true, taskOnly: false },
      allowed: false,
    },
  ])("maps $role with $access to allowed=$allowed", async ({ role, access, allowed }) => {
    setupAuth(mockSessionUser({ id: "u2", email: "e2", role, name: "n2" }));
    vi.mocked(getTaskAccessContext).mockResolvedValue(access);
    const res = await createSubtaskAction({
      taskId,
      title: "Subtask",
      due_date: dueDate,
      assignee_ids: [assigneeId],
    });
    if (allowed) {
      expect(res).toEqual({ success: true, data: { id: "st1" } });
    } else {
      expect(res).toEqual(forbiddenEnvelope);
    }
  });
});

describe("updateSubtaskAction", () => {
  it("returns invalid envelope for blank title", async () => {
    setupAuth(sessionAdmin);
    const res = await updateSubtaskAction({
      subtaskId,
      title: "   ",
      due_date: dueDate,
    });
    expect(res).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid subtask data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("returns not found when the subtask detail is missing", async () => {
    setupAuth(sessionAdmin);
    vi.mocked(getSubtaskDetailRowById).mockResolvedValue(null);
    const res = await updateSubtaskAction({
      subtaskId,
      title: "Renamed",
      due_date: dueDate,
    });
    expect(res).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Subtask not found",
        description: "The subtask may have been deleted by another user.",
      },
    });
  });

  it("returns forbidden without task.update on the parent context", async () => {
    setupAuth(mockSessionUser({ id: "u2", email: "e2", role: Role.Lawyer, name: "n2" }));
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: false,
    });
    const res = await updateSubtaskAction({
      subtaskId,
      title: "Renamed",
      due_date: dueDate,
    });
    expect(res).toEqual(forbiddenEnvelope);
    expect(updateSubtask).not.toHaveBeenCalled();
  });

  it("updates, audits, and revalidates on success", async () => {
    setupAuth(sessionAdmin);
    const res = await updateSubtaskAction({
      subtaskId,
      title: "Renamed",
      due_date: dueDate,
    });
    expect(res).toEqual({ success: true });
    expect(updateSubtask).toHaveBeenCalledWith(
      expect.objectContaining({ subtaskId: "st1", title: "Renamed" }),
    );
    await flushAfterCallbacks();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "subtask.updated",
        entityType: "Case",
        entityId: caseId,
      }),
    );
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/case/${caseId}`);
  });
});

describe("getSubtasksByTaskAction", () => {
  it("throws Forbidden when task read is denied", async () => {
    setupAuth(mockSessionUser({ id: "u2", email: "e2", role: Role.Lawyer, name: "n2" }));
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: false,
      own: false,
      taskOnly: false,
    });
    await expect(getSubtasksByTaskAction({ taskId })).rejects.toThrow("Forbidden");
  });

  it("returns rows directly when task read is granted", async () => {
    setupAuth(sessionAdmin);
    const rows: SubtaskRow[] = [
      {
        id: "st1",
        title: "Subtask",
        status: SubtaskStatus.Pending,
        due_date: dueDate,
        created_at: new Date("2026-10-01T09:00:00+08:00"),
        assignTo: "Alice",
      },
    ];
    vi.mocked(getSubtasksByTaskId).mockResolvedValue(rows);
    await expect(getSubtasksByTaskAction({ taskId })).resolves.toEqual(rows);
  });
});

describe("completeSubtaskAction", () => {
  it("completes without touching parent status (TC-083)", async () => {
    setupAuth(sessionAdmin);
    const res = await completeSubtaskAction({ subtaskId });
    expect(res).toEqual({ success: true });
    expect(completeSubtask).toHaveBeenCalledWith({ subtaskId: "st1", userId: "u2" });
    expect(vi.mocked(prisma.task.update)).not.toHaveBeenCalled();
    await flushAfterCallbacks();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "subtask.completed",
        entityType: "Case",
        entityId: caseId,
      }),
    );
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/case/${caseId}`);
  });

  it("second complete is a harmless no-op success", async () => {
    setupAuth(sessionAdmin);
    vi.mocked(getSubtaskDetailRowById).mockResolvedValue({
      ...detailRow,
      status: SubtaskStatus.Done,
    });
    const res = await completeSubtaskAction({ subtaskId });
    expect(res).toEqual({ success: true });
    expect(completeSubtask).not.toHaveBeenCalled();
  });
});

describe("deleteSubtaskAction", () => {
  it("requires task.delete on parent context (TC-084)", async () => {
    setupAuth(mockSessionUser({ id: "u2", email: "e2", role: Role.Lawyer, name: "n2" }));
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: false,
    });
    const res = await deleteSubtaskAction({ subtaskId });
    expect(res).toEqual(forbiddenEnvelope);
    expect(deleteSubtask).not.toHaveBeenCalled();
  });

  it("deletes, audits, and revalidates on success", async () => {
    setupAuth(sessionAdmin);
    const res = await deleteSubtaskAction({ subtaskId });
    expect(res).toEqual({ success: true });
    expect(deleteSubtask).toHaveBeenCalledWith({ subtaskId: "st1" });
    await flushAfterCallbacks();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "subtask.deleted",
        entityType: "Case",
        entityId: caseId,
      }),
    );
    expect(vi.mocked(revalidatePath)).toHaveBeenCalledWith(`/case/${caseId}`);
  });
});
