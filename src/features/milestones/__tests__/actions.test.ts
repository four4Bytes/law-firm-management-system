import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { FORBIDDEN_MESSAGE } from "@/lib/rbac";

import {
  createMilestoneAction,
  deleteMilestoneAction,
  getMilestoneRowByIdAction,
  updateMilestoneAction,
} from "../actions";
import { getMilestoneAccessContext, getMilestoneById, getMilestoneRowById } from "../queries";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u2", email: "e2", role: Role.Lawyer, name: "n2" }),
}));

vi.mock("@/features/cases/queries", () => ({
  getCaseAccessContext: vi.fn().mockResolvedValue({ assigned: false, own: false }),
  getCaseAssigneeIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/audit/mutations", () => ({
  createAuditLog: vi.fn(),
}));

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: vi.fn(),
}));

vi.mock("@/lib/path", () => ({
  getParentPath: vi.fn(),
}));

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
  reminder_days: null,
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

  it("returns canUpdate=true for owner who is also assigned", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u3",
      email: "e3",
      role: Role.Lawyer,
      name: "n3",
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
      reminder_days: null,
    };

    expect(await createMilestoneAction(payload)).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });

  it("creates milestone when authorized", async () => {
    const { getCaseAccessContext } = await import("@/features/cases/queries");
    const { createMilestone } = await import("../mutations");

    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: false });
    vi.mocked(createMilestone).mockResolvedValue({ id: "m1" });

    const payload = {
      title: "File complaint",
      description: "Description here",
      due_date: new Date("2024-06-01"),
      status: "Pending" as const,
      case_id: uuid,
      reminder_days: 3,
    };

    const result = await createMilestoneAction(payload);

    expect(result).toEqual({ success: true });
    expect(createMilestone).toHaveBeenCalledWith({
      case_id: uuid,
      title: "File complaint",
      description: "Description here",
      due_date: new Date("2024-06-01"),
      status: "Pending",
      reminder_days: 3,
    });
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
      error: FORBIDDEN_MESSAGE,
    });
  });

  it("updates milestone when authorized", async () => {
    const { getMilestoneAccessContext } = await import("../queries");
    const { updateMilestone } = await import("../mutations");

    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(updateMilestone).mockResolvedValue({ id: uuid });

    const payload = {
      milestoneId: uuid,
      title: "Updated title",
      description: "Updated description",
      due_date: new Date("2024-07-01"),
      status: "Done" as const,
    };

    const result = await updateMilestoneAction(payload);

    expect(result).toEqual({ success: true });
    expect(updateMilestone).toHaveBeenCalledWith({
      milestoneId: uuid,
      title: "Updated title",
      description: "Updated description",
      due_date: new Date("2024-07-01"),
      status: "Done",
    });
  });
});

describe("deleteMilestoneAction", () => {
  it("returns FORBIDDEN_MESSAGE when milestone delete is denied", async () => {
    expect(await deleteMilestoneAction({ milestoneId: uuid })).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });

  it("deletes milestone when authorized", async () => {
    const { getMilestoneAccessContext } = await import("../queries");
    const { deleteMilestone } = await import("../mutations");

    vi.mocked(getMilestoneAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(deleteMilestone).mockResolvedValue({ id: uuid });

    const result = await deleteMilestoneAction({ milestoneId: uuid });

    expect(result).toEqual({ success: true });
    expect(deleteMilestone).toHaveBeenCalledWith(uuid);
  });
});
