import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dispatchNotifications } from "@/features/notifications/dispatch";
import { NotificationType, Role, type Case } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { can, FORBIDDEN_MESSAGE } from "@/lib/rbac";

import {
  createCaseAction,
  deleteCaseAction,
  getCaseForEditAction,
  updateCaseAction,
  updateCaseWithClientAction,
} from "../actions";
import { createCase, deleteCase, updateCase, updateCaseWithClient } from "../mutations";
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
    if (!can(session.role, permission, context)) throw new Error("Forbidden");
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
  deleteCase: vi.fn(),
}));

vi.mock("../queries", () => ({
  getCaseEditData: vi.fn(),
  getCaseAccessContext: vi.fn().mockResolvedValue({ assigned: false, own: false }),
  getCaseBySourceConsultationId: vi.fn().mockResolvedValue(null),
  getCaseAssigneeIds: vi.fn().mockResolvedValue([]),
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

    const result = await createCaseAction({
      ...validPayload,
      source_consultation_id: uuid,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Case already exists",
        description: "A case already exists for this consultation.",
      },
    });
  });

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
        description: "A case already exists for this consultation.",
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
    status: "Open" as const,
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
    status: "Open" as const,
  };

  const updateWithClientPayload = {
    case_id: uuid,
    client_id: uuid,
    client: { name: "John Doe" },
    case: {
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open" as const,
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
    status: "Open" as const,
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
      client: { name: "John Doe" },
      case: {
        case_title: "Smith vs Jones",
        case_type: "Civil",
        status: "Open" as const,
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
