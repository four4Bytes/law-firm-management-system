import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getConsultationEditData } from "@/features/consultations/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { NotificationType, Role, type Case } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { can, FORBIDDEN_MESSAGE } from "@/lib/rbac";

import {
  changeCaseStatusAction,
  createCaseAction,
  deleteCaseAction,
  getCaseForEditAction,
  updateCaseAction,
  updateCaseWithClientAction,
} from "../actions";
import {
  createCase,
  deleteCase,
  transitionCaseWithNote,
  updateCase,
  updateCaseStatus,
  updateCaseWithClient,
} from "../mutations";
import {
  getCaseAccessContext,
  getCaseAssigneeIds,
  getCaseBySourceConsultationId,
  getCaseEditData,
} from "../queries";

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
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: Role.Admin, name: "n" }),
  requirePermission: vi
    .fn()
    .mockResolvedValue({ id: "u1", email: "e", role: Role.Admin, name: "n" }),
  assertRecordPermission: vi.fn((session, permission, context) => {
    if (!can(session.role, permission, context)) throw new ForbiddenError();
    return context;
  }),
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

vi.mock("@/features/audit/mutations", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ count: 0 }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    case: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    caseAssignment: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../mutations", () => ({
  createCase: vi.fn(),
  createCaseWithClient: vi.fn(),
  updateCase: vi.fn(),
  updateCaseWithClient: vi.fn(),
  updateCaseStatus: vi.fn(),
  transitionCaseWithNote: vi.fn(),
  deleteCase: vi.fn(),
}));

vi.mock("../queries", () => ({
  getCaseEditData: vi.fn(),
  getCaseAccessContext: vi.fn().mockResolvedValue({ assigned: false, own: false }),
  getCaseBySourceConsultationId: vi.fn().mockResolvedValue(null),
  getCaseAssigneeIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/consultations/queries", () => ({
  getConsultationEditData: vi.fn(),
}));

type CaseWithAssignments = Case & { caseAssignments: { user_id: string }[] };

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const caseRecord: CaseWithAssignments = {
  id: "1",
  client_id: uuid,
  case_title: "Smith vs Jones",
  case_type: "Civil",
  status: "Open",
  parties_involved: null,
  source_consultation_id: null,
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  caseAssignments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: false, own: false });
  vi.mocked(getCaseEditData).mockResolvedValue({
    id: "1",
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
    parties_involved: null,
    source_consultation_id: null,
    assignee_ids: [],
    assignees: [],
  });
});

describe("getCaseForEditAction", () => {
  it("returns edit data for a valid id", async () => {
    const result = await getCaseForEditAction(uuid);

    expect(result).toEqual({
      id: "1",
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: null,
      source_consultation_id: null,
      assignee_ids: [],
      assignees: [],
    });
    expect(getCaseEditData).toHaveBeenCalledWith(uuid);
  });

  it("throws for an invalid id", async () => {
    await expect(getCaseForEditAction("abc")).rejects.toThrow("Invalid case ID");
  });

  it("returns null when the case is not found", async () => {
    vi.mocked(getCaseEditData).mockResolvedValue(null);

    const result = await getCaseForEditAction(uuid);

    expect(result).toBeNull();
  });
});

describe("createCaseAction", () => {
  const validPayload = {
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open" as const,
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await createCaseAction({} as any)).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid case data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("creates a case and revalidates the list", async () => {
    vi.mocked(createCase).mockResolvedValue({ id: "1" });

    const result = await createCaseAction(validPayload);

    expect(result).toEqual({ success: true, data: { id: "1" } });
    expect(createCase).toHaveBeenCalledWith(
      expect.objectContaining({
        case_type: "Civil",
        created_by_user_id: "u1",
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/case");
    expect(dispatchNotifications).not.toHaveBeenCalled();
  });

  it("dispatches CaseAssigned to the assignees on creation", async () => {
    vi.mocked(createCase).mockResolvedValue({ id: "1" });

    const result = await createCaseAction({
      ...validPayload,
      assignee_ids: [uuid, "550e8400-e29b-41d4-a716-446655440001"],
    });

    expect(result).toEqual({ success: true, data: { id: "1" } });
    await flushAfterCallbacks();

    expect(dispatchNotifications).toHaveBeenCalledTimes(1);
    const [payload, actorUserId] = vi.mocked(dispatchNotifications).mock.calls[0];
    expect(payload.type).toBe(NotificationType.CaseAssigned);
    expect(payload.userIds).toEqual([uuid, "550e8400-e29b-41d4-a716-446655440001"]);
    expect(actorUserId).toBe("u1");
    expect(payload.caseId).toBe("1");
  });

  it("returns an error when creation fails", async () => {
    vi.mocked(createCase).mockRejectedValue(new Error("db error"));

    expect(await createCaseAction(validPayload)).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to create case",
        description: "Something went wrong on our end. Please try again.",
      },
    });
  });

  it("returns duplicate error on P2002 unique constraint violation", async () => {
    vi.mocked(createCase).mockRejectedValue(
      Object.assign(new Error("Unique constraint"), { code: "P2002" }),
    );
    vi.mocked(getConsultationEditData).mockResolvedValue(completedConsultation());

    const result = await createCaseAction({
      ...validPayload,
      source_consultation_id: uuid,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Case already exists",
        description:
          "A case already exists for this consultation. Open the linked case instead of creating a duplicate.",
      },
    });
  });

  function completedConsultation() {
    return {
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-06-01T10:00:00.000Z"),
      status: "Completed" as const,
      assignee_ids: [],
      assignees: [],
    };
  }

  it("returns an error when a case already exists for the consultation", async () => {
    vi.mocked(getCaseBySourceConsultationId).mockResolvedValue({ ...caseRecord, id: "existing-1" });

    const result = await createCaseAction({
      ...validPayload,
      source_consultation_id: uuid,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Case already exists",
        description:
          "A case already exists for this consultation. Open the linked case instead of creating a duplicate.",
      },
    });
    expect(createCase).not.toHaveBeenCalled();
  });

  it("creates a case from a completed consultation", async () => {
    vi.mocked(getCaseBySourceConsultationId).mockResolvedValue(null);
    vi.mocked(getConsultationEditData).mockResolvedValue(completedConsultation());
    vi.mocked(createCase).mockResolvedValue({ id: "1" });

    const result = await createCaseAction({
      ...validPayload,
      source_consultation_id: uuid,
    });

    expect(result).toEqual({ success: true, data: { id: "1" } });
    expect(getConsultationEditData).toHaveBeenCalledWith(uuid);
  });

  it("returns not_found when the source consultation is missing", async () => {
    vi.mocked(getCaseBySourceConsultationId).mockResolvedValue(null);
    vi.mocked(getConsultationEditData).mockResolvedValue(null);

    const result = await createCaseAction({
      ...validPayload,
      source_consultation_id: uuid,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Consultation not found",
        description: "The consultation may have been deleted by another user.",
      },
    });
    expect(createCase).not.toHaveBeenCalled();
  });

  it("rejects a case from a scheduled consultation", async () => {
    vi.mocked(getCaseBySourceConsultationId).mockResolvedValue(null);
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...completedConsultation(),
      status: "Scheduled",
    });

    const result = await createCaseAction({
      ...validPayload,
      source_consultation_id: uuid,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Consultation cannot become a case",
        description:
          "Only completed or accepted consultations can become a case. This consultation is scheduled. Mark it as completed first.",
      },
    });
    expect(createCase).not.toHaveBeenCalled();
  });

  it("rejects a case when the client does not match the consultation", async () => {
    vi.mocked(getCaseBySourceConsultationId).mockResolvedValue(null);
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...completedConsultation(),
      client_id: "550e8400-e29b-41d4-a716-446655440099",
    });

    const result = await createCaseAction({
      ...validPayload,
      source_consultation_id: uuid,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Client mismatch",
        description:
          "The case must use the same client as the consultation. Change the client on the case or create it without a consultation link.",
      },
    });
    expect(createCase).not.toHaveBeenCalled();
  });
});

describe("updateCaseAction", () => {
  const validPayload = {
    caseId: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await updateCaseAction({ caseId: uuid } as any)).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid case data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("returns an error when the case is not found", async () => {
    vi.mocked(getCaseEditData).mockResolvedValue(null);

    expect(await updateCaseAction(validPayload)).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Case not found",
        description: "The case may have been deleted by another user.",
      },
    });
  });

  it("updates a case and revalidates", async () => {
    vi.mocked(updateCase).mockResolvedValue({ id: uuid });

    expect(await updateCaseAction(validPayload)).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/case/${uuid}`);
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("returns an error when update fails", async () => {
    vi.mocked(updateCase).mockRejectedValue(new Error("db error"));

    expect(await updateCaseAction(validPayload)).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to update case",
        description: "Something went wrong on our end. Please try again.",
      },
    });
  });
});

describe("deleteCaseAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteCaseAction({ caseId: "abc" })).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid case data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("returns an error when the case is not found", async () => {
    vi.mocked(getCaseEditData).mockResolvedValue(null);

    expect(await deleteCaseAction({ caseId: uuid })).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Case not found",
        description: "The case may have been deleted by another user.",
      },
    });
  });

  it("deletes a case and revalidates the list", async () => {
    vi.mocked(deleteCase).mockResolvedValue({ id: uuid });

    expect(await deleteCaseAction({ caseId: uuid })).toEqual({ success: true });
    expect(deleteCase).toHaveBeenCalledWith(uuid);
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("returns a failure status when the underlying delete throws", async () => {
    vi.mocked(getCaseEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      source_consultation_id: null,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      parties_involved: null,
      status: "Open",
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(deleteCase).mockRejectedValue(new Error("S3 unavailable"));

    expect(await deleteCaseAction({ caseId: uuid })).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to delete case",
        description: "Something went wrong on our end. Please try again.",
      },
    });
  });
});

describe("authorization guards for non-Admin users", () => {
  const updatePayload = {
    caseId: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
  };

  const updateWithClientPayload = {
    case_id: uuid,
    client_id: uuid,
    client: { name: "John Doe", phone_number: "09170000001" },
    case: {
      case_title: "Smith vs Jones",
      case_type: "Civil",
    },
  };

  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Lawyer,
      name: "n2",
    });
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseRecord);
  });

  afterEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u1",
      email: "e",
      role: Role.Admin,
      name: "n",
    });
  });

  it("returns forbidden envelope from updateCaseAction when not assigned and not the owner", async () => {
    expect(await updateCaseAction(updatePayload)).toEqual({
      success: false,
      error: { code: "forbidden", title: "Access denied", description: FORBIDDEN_MESSAGE },
    });
  });

  it("returns forbidden envelope from updateCaseWithClientAction when not assigned and not the owner", async () => {
    expect(await updateCaseWithClientAction(updateWithClientPayload)).toEqual({
      success: false,
      error: { code: "forbidden", title: "Access denied", description: FORBIDDEN_MESSAGE },
    });
  });

  it("returns forbidden envelope from deleteCaseAction when not assigned and not the owner", async () => {
    expect(await deleteCaseAction({ caseId: uuid })).toEqual({
      success: false,
      error: { code: "forbidden", title: "Access denied", description: FORBIDDEN_MESSAGE },
    });
  });

  it("returns success from updateCaseAction when assigned to the case", async () => {
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: false });
    vi.mocked(getCaseEditData).mockResolvedValue({
      id: "1",
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: null,
      source_consultation_id: null,
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(updateCase).mockResolvedValue({ id: uuid });

    const result = await updateCaseAction(updatePayload);

    expect(result).toEqual({ success: true });
  });

  it("returns success from updateCaseWithClientAction when assigned to the case", async () => {
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: false });
    vi.mocked(getCaseEditData).mockResolvedValue({
      id: "1",
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: null,
      source_consultation_id: null,
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(updateCaseWithClient).mockResolvedValue({ id: uuid });

    const result = await updateCaseWithClientAction(updateWithClientPayload);

    expect(result).toEqual({ success: true });
  });

  it("returns success from deleteCaseAction when the owner of the case", async () => {
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: false, own: true });
    vi.mocked(getCaseEditData).mockResolvedValue({
      id: "1",
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: null,
      source_consultation_id: null,
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(deleteCase).mockResolvedValue({ id: uuid });

    const result = await deleteCaseAction({ caseId: uuid });

    expect(result).toEqual({ success: true });
  });
});

describe("updateCaseAction notification split", () => {
  const validPayload = {
    caseId: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
  };

  const assignee1 = uuid;
  const assignee2 = "550e8400-e29b-41d4-a716-446655440001";
  const assignee3 = "550e8400-e29b-41d4-a716-446655440002";

  beforeEach(() => {
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: false });
    vi.mocked(getCaseEditData).mockResolvedValue({
      id: "1",
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: null,
      source_consultation_id: null,
      assignee_ids: [assignee1, assignee2],
      assignees: [],
    });
    vi.mocked(getCaseAssigneeIds).mockResolvedValue([assignee1, assignee2, assignee3]);
    vi.mocked(updateCase).mockResolvedValue({ id: uuid });
  });

  it("dispatches CaseAssigned only to the new assignee", async () => {
    await updateCaseAction({ ...validPayload, assignee_ids: [assignee1, assignee2, assignee3] });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const assigned = calls.find(([payload]) => payload.type === NotificationType.CaseAssigned);

    expect(calls).toHaveLength(1);
    expect(assigned?.[0].userIds).toEqual([assignee3]);
  });

  it("dispatches nothing when no assignee was added", async () => {
    vi.mocked(getCaseAssigneeIds).mockResolvedValue([assignee1, assignee2]);

    await updateCaseAction(validPayload);
    await flushAfterCallbacks();

    expect(vi.mocked(dispatchNotifications)).not.toHaveBeenCalled();
  });

  it("dispatches only CaseAssigned for a brand-new assignee list", async () => {
    vi.mocked(getCaseEditData).mockResolvedValue({
      id: "1",
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: null,
      source_consultation_id: null,
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(getCaseAssigneeIds).mockResolvedValue([assignee3]);

    await updateCaseAction({ ...validPayload, assignee_ids: [assignee3] });
    await flushAfterCallbacks();

    const types = vi.mocked(dispatchNotifications).mock.calls.map(([payload]) => payload.type);
    expect(types).toEqual([NotificationType.CaseAssigned]);
  });

  it("dispatches CaseAssigned only for updateCaseWithClientAction", async () => {
    vi.mocked(updateCaseWithClient).mockResolvedValue({ id: uuid });

    await updateCaseWithClientAction({
      case_id: uuid,
      client_id: uuid,
      client: { name: "John Doe", phone_number: "09170000001" },
      case: {
        case_title: "Smith vs Jones",
        case_type: "Civil",
        assignee_ids: [assignee1, assignee2, assignee3],
      },
    });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const assigned = calls.find(([payload]) => payload.type === NotificationType.CaseAssigned);

    expect(calls).toHaveLength(1);
    expect(assigned?.[0].userIds).toEqual([assignee3]);
  });
});

describe("changeCaseStatusAction", () => {
  const assignee1 = uuid;
  const assignee2 = "550e8400-e29b-41d4-a716-446655440001";

  function openEditData() {
    return {
      id: "1",
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open" as const,
      parties_involved: null,
      source_consultation_id: null,
      assignee_ids: [assignee1, assignee2],
      assignees: [],
    };
  }

  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u1",
      email: "e",
      role: Role.Admin,
      name: "n",
    });
    vi.mocked(getCaseEditData).mockResolvedValue(openEditData());
    vi.mocked(getCaseAssigneeIds).mockResolvedValue([assignee1, assignee2]);
    vi.mocked(updateCaseStatus).mockResolvedValue({ id: uuid });
    vi.mocked(transitionCaseWithNote).mockResolvedValue({ id: uuid });
  });

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await changeCaseStatusAction({ caseId: uuid } as any)).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid case data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("returns an error when the case is not found", async () => {
    vi.mocked(getCaseEditData).mockResolvedValue(null);

    expect(await changeCaseStatusAction({ caseId: uuid, status: "Closed" })).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Case not found",
        description: "The case may have been deleted by another user.",
      },
    });
  });

  it("denies users without case update access", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });

    expect(await changeCaseStatusAction({ caseId: uuid, status: "Closed" })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
    expect(updateCaseStatus).not.toHaveBeenCalled();
  });

  it("returns an error for an invalid transition", async () => {
    expect(await changeCaseStatusAction({ caseId: uuid, status: "Open" })).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Invalid status change",
        description:
          "Cannot change a case from Open to Open. From Open, you can: close it, settle it, or terminate it.",
      },
    });
    expect(updateCaseStatus).not.toHaveBeenCalled();
  });

  it("refuses moving backwards from a terminal status", async () => {
    vi.mocked(getCaseEditData).mockResolvedValue({ ...openEditData(), status: "Closed" });

    expect(await changeCaseStatusAction({ caseId: uuid, status: "Settled" })).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Invalid status change",
        description:
          "Cannot change a case from Closed to Settled. From Closed, you can: reopen it.",
      },
    });
    expect(updateCaseStatus).not.toHaveBeenCalled();
  });

  it("closes an open case and notifies assignees", async () => {
    expect(await changeCaseStatusAction({ caseId: uuid, status: "Closed" })).toEqual({
      success: true,
    });
    expect(updateCaseStatus).toHaveBeenCalledWith(uuid, "Closed", "Open");
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const statusChange = calls.find(
      ([payload]) => payload.type === NotificationType.CaseStatusChanged,
    );

    expect(statusChange?.[0].userIds).toEqual([assignee1, assignee2]);
    expect(statusChange?.[0].message).toContain("Open");
    expect(statusChange?.[0].message).toContain("Closed");
  });

  it("saves a settlement reason as a note", async () => {
    expect(
      await changeCaseStatusAction({
        caseId: uuid,
        status: "Settled",
        reason: "Compromise agreement signed",
      }),
    ).toEqual({ success: true });
    expect(transitionCaseWithNote).toHaveBeenCalledWith({
      caseId: uuid,
      status: "Settled",
      reason: "Compromise agreement signed",
      decidedByUserId: "u1",
      expectedStatus: "Open",
    });
    expect(updateCaseStatus).not.toHaveBeenCalled();
  });

  it("reopens a terminated case", async () => {
    vi.mocked(getCaseEditData).mockResolvedValue({ ...openEditData(), status: "Terminated" });

    expect(await changeCaseStatusAction({ caseId: uuid, status: "Open" })).toEqual({
      success: true,
    });
    expect(updateCaseStatus).toHaveBeenCalledWith(uuid, "Open", "Terminated");
  });
});
