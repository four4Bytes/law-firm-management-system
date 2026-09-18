import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCaseAccessContext, getCaseAssigneeIds } from "@/features/cases/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { NotificationType, Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { FORBIDDEN_MESSAGE } from "@/lib/rbac";

import {
  createMilestoneAction,
  deleteMilestoneAction,
  getMilestoneRowByIdAction,
  updateMilestoneAction,
} from "../actions";
import { createMilestone, deleteMilestone, updateMilestone } from "../mutations";
import { getMilestoneAccessContext, getMilestoneById, getMilestoneRowById } from "../queries";

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
  getCaseAssigneeIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/audit/mutations", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn(),
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
  getMilestoneAccessContext: vi.fn(),
  getMilestoneById: vi.fn(),
  getMilestoneRowById: vi.fn(),
}));

vi.mock("../mutations", () => ({
  createMilestone: vi.fn(),
  updateMilestone: vi.fn(),
  deleteMilestone: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const milestoneRecord = {
  id: "m1",
  title: "File complaint",
  description: null,
  due_date: new Date("2024-06-01"),
  status: "Pending" as const,
  case_id: uuid,
};

const milestoneRow = {
  id: "m1",
  title: "File complaint",
  description: null,
  due_date: new Date("2024-06-01"),
  status: "Pending" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: false, own: false });
  vi.mocked(getMilestoneById).mockResolvedValue(milestoneRecord);
  vi.mocked(getMilestoneRowById).mockResolvedValue(milestoneRow);
});

afterEach(() => {
  vi.mocked(requireAuth).mockResolvedValue({
    id: "u2",
    email: "e2",
    role: Role.Lawyer,
    name: "n2",
  });
});

describe("getMilestoneRowByIdAction", () => {
  it("throws Forbidden when milestone read is denied", async () => {
    await expect(getMilestoneRowByIdAction(uuid)).rejects.toThrow("Forbidden");
  });

  it("returns canUpdate=false for a Paralegal who is assigned but cannot update", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: false });

    const result = await getMilestoneRowByIdAction(uuid);

    expect(result).toEqual({ row: milestoneRow, canUpdate: false });
  });

  it("returns canUpdate=true for an owner who is assigned", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Lawyer,
      name: "n2",
    });
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await getMilestoneRowByIdAction(uuid);

    expect(result).toEqual({ row: milestoneRow, canUpdate: true });
  });
});

describe("createMilestoneAction", () => {
  it("returns FORBIDDEN_MESSAGE when milestone create is denied on the parent case", async () => {
    const payload = {
      title: "File complaint",
      description: undefined,
      due_date: new Date("2024-06-01"),
      status: "Pending" as const,
      case_id: uuid,
    };

    expect(await createMilestoneAction(payload)).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: FORBIDDEN_MESSAGE,
      },
    });
  });

  it("returns success when authorized", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Lawyer,
      name: "n2",
    });
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(createMilestone).mockResolvedValue(milestoneRecord);

    const payload = {
      title: "File complaint",
      description: undefined,
      due_date: new Date("2099-06-01"),
      status: "Pending" as const,
      case_id: uuid,
    };

    const result = await createMilestoneAction(payload);

    expect(result).toEqual({ success: true, data: { id: "m1" } });
  });

  it("refuses a past due date on creation", async () => {
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: true });

    const payload = {
      title: "File complaint",
      description: undefined,
      due_date: new Date("2024-06-01"),
      status: "Pending" as const,
      case_id: uuid,
    };

    expect(await createMilestoneAction(payload)).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Due date is in the past",
        description: "A new milestone cannot be due in the past. Choose today or a future date.",
      },
    });
    expect(createMilestone).not.toHaveBeenCalled();
  });

  it("refuses a non-Pending status on creation", async () => {
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: true });

    const payload = {
      title: "File complaint",
      description: undefined,
      due_date: new Date("2099-06-01"),
      status: "Done" as const,
      case_id: uuid,
    };

    expect(await createMilestoneAction(payload)).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Milestones are created as Pending",
        description:
          "A new milestone always starts as Pending. Mark it as Done or Cancelled from the case page after creation.",
      },
    });
    expect(createMilestone).not.toHaveBeenCalled();
  });
});

describe("updateMilestoneAction", () => {
  it("returns FORBIDDEN_MESSAGE when milestone update is denied", async () => {
    const payload = {
      milestoneId: uuid,
      title: "Renamed",
      description: undefined,
      due_date: new Date("2024-06-01"),
      status: "Done" as const,
    };

    expect(await updateMilestoneAction(payload)).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: FORBIDDEN_MESSAGE,
      },
    });
  });

  it("returns success when authorized", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Lawyer,
      name: "n2",
    });
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(updateMilestone).mockResolvedValue(milestoneRecord);

    const payload = {
      milestoneId: uuid,
      title: "Renamed",
      description: undefined,
      due_date: new Date("2024-06-01"),
      status: "Done" as const,
    };

    const result = await updateMilestoneAction(payload);

    expect(result).toEqual({ success: true });
  });

  it("resets reminder timing when due_date changes", async () => {
    vi.mocked(getMilestoneById).mockResolvedValue(milestoneRecord);
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });

    const payload = {
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: new Date("2099-06-15"),
      status: milestoneRecord.status,
    };

    const result = await updateMilestoneAction(payload);

    expect(result).toEqual({ success: true });
    expect(updateMilestone).toHaveBeenCalledWith(
      uuid,
      expect.objectContaining({ resetReminderTiming: true }),
    );
  });

  it("refuses rescheduling a pending milestone to the past", async () => {
    vi.mocked(getMilestoneById).mockResolvedValue(milestoneRecord);
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await updateMilestoneAction({
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: new Date("2024-05-01"),
      status: "Pending" as const,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Due date is in the past",
        description:
          "A pending milestone cannot be due in the past. Choose today or a future date.",
      },
    });
    expect(updateMilestone).not.toHaveBeenCalled();
  });

  it("refuses completing a milestone with a future due date", async () => {
    vi.mocked(getMilestoneById).mockResolvedValue(milestoneRecord);
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await updateMilestoneAction({
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: new Date("2099-06-01"),
      status: "Done" as const,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Due date is in the future",
        description:
          "A completed milestone cannot be due in the future. Choose today or a past date.",
      },
    });
    expect(updateMilestone).not.toHaveBeenCalled();
  });

  it("allows completing a milestone with a past due date", async () => {
    vi.mocked(getMilestoneById).mockResolvedValue(milestoneRecord);
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(updateMilestone).mockResolvedValue(milestoneRecord);

    const result = await updateMilestoneAction({
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: new Date("2024-05-01"),
      status: "Done" as const,
    });

    expect(result).toEqual({ success: true });
  });

  it("refuses an invalid status transition", async () => {
    vi.mocked(getMilestoneById).mockResolvedValue({ ...milestoneRecord, status: "Done" });
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await updateMilestoneAction({
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: milestoneRecord.due_date,
      status: "Cancelled" as const,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Invalid status change",
        description:
          "Cannot change a milestone from Done to Cancelled. From Done, you can: reopen it.",
      },
    });
    expect(updateMilestone).not.toHaveBeenCalled();
  });

  it("resets reminder timing when reopening to Pending", async () => {
    const future = new Date(Date.now() + 86400000);
    vi.mocked(getMilestoneById).mockResolvedValue({
      ...milestoneRecord,
      status: "Done",
      due_date: future,
    });
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(updateMilestone).mockResolvedValue(milestoneRecord);

    const result = await updateMilestoneAction({
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: future,
      status: "Pending" as const,
    });

    expect(result).toEqual({ success: true });
    expect(updateMilestone).toHaveBeenCalledWith(
      uuid,
      expect.objectContaining({ resetReminderTiming: true, status: "Pending" }),
    );
  });

  it("refuses Pending-to-Done with an unchanged future date", async () => {
    const future = new Date(Date.now() + 86400000);
    vi.mocked(getMilestoneById).mockResolvedValue({
      ...milestoneRecord,
      status: "Pending",
      due_date: future,
    });
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await updateMilestoneAction({
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: future,
      status: "Done" as const,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Due date is in the future",
        description:
          "A completed milestone cannot be due in the future. Choose today or a past date.",
      },
    });
    expect(updateMilestone).not.toHaveBeenCalled();
  });

  it("refuses terminal-to-Pending with an unchanged past date", async () => {
    const past = new Date("2024-06-01");
    vi.mocked(getMilestoneById).mockResolvedValue({
      ...milestoneRecord,
      status: "Done",
      due_date: past,
    });
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await updateMilestoneAction({
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: past,
      status: "Pending" as const,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Due date is in the past",
        description:
          "A pending milestone cannot be due in the past. Choose today or a future date.",
      },
    });
    expect(updateMilestone).not.toHaveBeenCalled();
  });
});

describe("updateMilestoneAction notifications", () => {
  const assignee1 = uuid;
  const assignee2 = "550e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(getCaseAssigneeIds).mockResolvedValue([assignee1, assignee2]);
    vi.mocked(updateMilestone).mockResolvedValue(milestoneRecord);
  });

  it("dispatches MilestoneStatusChanged to case assignees on a status change", async () => {
    await updateMilestoneAction({
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: milestoneRecord.due_date,
      status: "Done" as const,
    });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    expect(calls).toHaveLength(1);

    const [payload, actorUserId] = calls[0];
    expect(payload.type).toBe(NotificationType.MilestoneStatusChanged);
    expect(payload.userIds).toEqual([assignee1, assignee2]);
    expect(payload.title).toBe(`Milestone status changed: ${milestoneRecord.title}`);
    expect(payload.message).toBe(
      `Milestone "${milestoneRecord.title}" status changed from Pending to Done`,
    );
    expect(actorUserId).toBe("u2");
  });

  it("dispatches nothing when only content changes", async () => {
    await updateMilestoneAction({
      milestoneId: uuid,
      title: "Renamed",
      description: undefined,
      due_date: milestoneRecord.due_date,
      status: milestoneRecord.status,
    });
    await flushAfterCallbacks();

    expect(dispatchNotifications).not.toHaveBeenCalled();
  });

  it("dispatches MilestoneDueDateChanged when the due date changes", async () => {
    await updateMilestoneAction({
      milestoneId: uuid,
      title: milestoneRecord.title,
      description: undefined,
      due_date: new Date("2099-07-01"),
      status: milestoneRecord.status,
    });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const rescheduled = calls.find(
      ([payload]) => payload.type === NotificationType.MilestoneDueDateChanged,
    );

    expect(calls).toHaveLength(1);
    expect(rescheduled?.[0].userIds).toEqual([assignee1, assignee2]);
    expect(rescheduled?.[0].message).toContain("rescheduled");
  });
});

describe("deleteMilestoneAction", () => {
  it("returns FORBIDDEN_MESSAGE when milestone delete is denied", async () => {
    expect(await deleteMilestoneAction({ milestoneId: uuid })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: FORBIDDEN_MESSAGE,
      },
    });
  });

  it("returns success when authorized", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Lawyer,
      name: "n2",
    });
    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(deleteMilestone).mockResolvedValue(milestoneRecord);

    const result = await deleteMilestoneAction({ milestoneId: uuid });

    expect(result).toEqual({ success: true });
  });
});
