import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getConsultationAssigneeIds,
  getConsultationEditData,
  hasLinkedCase,
} from "@/features/consultations/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { NotificationType, Role, type Consultation } from "@/generated/prisma/browser";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth, requirePermission } from "@/lib/auth-guards";
import { getStartOfDay } from "@/lib/date";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { can, FORBIDDEN_MESSAGE } from "@/lib/rbac";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import {
  acceptConsultationWithCaseAction,
  changeConsultationStatusAction,
  createConsultationAction,
  createConsultationWithClientAction,
  deleteConsultationAction,
  getConsultationForEditAction,
  updateConsultationAction,
  updateConsultationWithClientAction,
} from "../actions";

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

vi.mock("@/features/documents/queries", () => ({
  getDocumentFilePathsByConsultationId: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/storage-cleanup", () => ({
  deleteDocumentFiles: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ count: 0 }),
}));

interface MockConsultationActionPrisma {
  consultation: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  consultationAssignment: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  client: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  case: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  note: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
}

vi.mock("@/lib/prisma", () => {
  const consultation = {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    delete: vi.fn(),
    findUnique: vi.fn(),
  };
  const consultationAssignment = { findFirst: vi.fn(), findMany: vi.fn() };
  const client = { create: vi.fn(), update: vi.fn() };
  const caseModel = {
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
  };
  const note = { create: vi.fn() };
  const prisma: MockConsultationActionPrisma = {
    consultation,
    consultationAssignment,
    client,
    case: caseModel,
    note,
    $transaction: vi.fn((fn: (tx: MockConsultationActionPrisma) => Promise<unknown>) => fn(prisma)),
  };
  return { prisma };
});

vi.mock("@/features/consultations/queries", () => ({
  getConsultationEditData: vi.fn(),
  getConsultationAccessContext: vi.fn().mockResolvedValue({ assigned: false, own: false }),
  getConsultationAssigneeIds: vi.fn().mockResolvedValue([]),
  hasLinkedCase: vi.fn().mockResolvedValue(false),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

type ConsultationWithAssignments = Consultation & {
  consultationAssignments: { user_id: string }[];
};

const consultationRecord: ConsultationWithAssignments = {
  id: "1",
  client_id: uuid,
  concern: "Legal advice",
  booking_datetime: new Date("2024-06-01T10:00:00"),
  status: "Scheduled",
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  last_reminded_at: null,
  consultationAssignments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.consultationAssignment.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.consultationAssignment.findMany).mockResolvedValue([]);
});

describe("getConsultationForEditAction", () => {
  it("returns edit data for a valid id", async () => {
    const editData = {
      id: "1",
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: consultationRecord.booking_datetime,
      status: "Scheduled" as const,
      assignee_ids: [],
      assignees: [],
    };
    vi.mocked(getConsultationEditData).mockResolvedValue(editData);

    const result = await getConsultationForEditAction(uuid);

    expect(result).toEqual(editData);
    expect(getConsultationEditData).toHaveBeenCalledWith(uuid);
  });

  it("throws for an invalid id", async () => {
    await expect(getConsultationForEditAction("abc")).rejects.toThrow("Invalid consultation ID");
  });
});

describe("createConsultationAction", () => {
  const validPayload = {
    client_id: uuid,
    concern: "Legal advice",
    booking_datetime: "2099-06-01T10:00:00.000Z",
    status: "Scheduled" as const,
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await createConsultationAction({} as any)).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid consultation data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("creates a consultation and revalidates the list", async () => {
    vi.mocked(prisma.consultation.create).mockResolvedValue(consultationRecord);

    const result = await createConsultationAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(prisma.consultation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ concern: "Legal advice", created_by_user_id: "u1" }),
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/consultation");
    expect(dispatchNotifications).not.toHaveBeenCalled();
  });

  it("returns an error when creation fails", async () => {
    vi.mocked(prisma.consultation.create).mockRejectedValue(new Error("db error"));

    expect(await createConsultationAction(validPayload)).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to create consultation",
        description: "Something went wrong on our end. Please try again.",
      },
    });
  });

  it("refuses a scheduled booking in the past", async () => {
    expect(
      await createConsultationAction({
        ...validPayload,
        booking_datetime: "2024-06-01T10:00:00.000Z",
      }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Booking date is in the past",
        description:
          "A scheduled consultation cannot be booked in the past. If the meeting already happened, create it as Completed instead.",
      },
    });
    expect(prisma.consultation.create).not.toHaveBeenCalled();
  });

  it("refuses a completed booking in the future", async () => {
    expect(
      await createConsultationAction({
        ...validPayload,
        status: "Completed" as const,
      }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Booking date is in the future",
        description:
          "A completed consultation cannot be booked in the future. If the meeting has not happened yet, create it as Scheduled instead.",
      },
    });
    expect(prisma.consultation.create).not.toHaveBeenCalled();
  });

  it("allows a completed booking in the past", async () => {
    vi.mocked(prisma.consultation.create).mockResolvedValue(consultationRecord);

    expect(
      await createConsultationAction({
        ...validPayload,
        status: "Completed" as const,
        booking_datetime: "2024-06-01T10:00:00.000Z",
      }),
    ).toEqual({ success: true });
  });

  it("allows a scheduled booking earlier today", async () => {
    vi.mocked(prisma.consultation.create).mockResolvedValue(consultationRecord);

    expect(
      await createConsultationAction({
        ...validPayload,
        booking_datetime: getStartOfDay(new Date()),
      }),
    ).toEqual({ success: true });
  });

  it("allows a completed booking later today", async () => {
    vi.mocked(prisma.consultation.create).mockResolvedValue(consultationRecord);

    const laterToday = new Date(getStartOfDay(new Date()).getTime() + 12 * 60 * 60 * 1000);

    expect(
      await createConsultationAction({
        ...validPayload,
        status: "Completed" as const,
        booking_datetime: laterToday,
      }),
    ).toEqual({ success: true });
  });

  it("refuses a scheduled booking in the past with a client", async () => {
    expect(
      await createConsultationWithClientAction({
        client: { name: "John Doe", phone_number: "09170000001" },
        consultation: {
          concern: "Legal advice",
          booking_datetime: "2024-06-01T10:00:00.000Z",
          status: "Scheduled" as const,
        },
      }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Booking date is in the past",
        description:
          "A scheduled consultation cannot be booked in the past. If the meeting already happened, create it as Completed instead.",
      },
    });
  });

  it("threads assignee_ids into the create mutation", async () => {
    vi.mocked(prisma.consultation.create).mockResolvedValue(consultationRecord);

    const result = await createConsultationAction({
      ...validPayload,
      assignee_ids: [uuid, "550e8400-e29b-41d4-a716-446655440001"],
    });

    expect(result).toEqual({ success: true });
    expect(prisma.consultation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          consultationAssignments: {
            create: [{ user_id: uuid }, { user_id: "550e8400-e29b-41d4-a716-446655440001" }],
          },
        }),
      }),
    );
  });

  it("dispatches ConsultationAssigned to the assignees on creation", async () => {
    vi.mocked(prisma.consultation.create).mockResolvedValue(consultationRecord);

    const result = await createConsultationAction({
      ...validPayload,
      assignee_ids: [uuid, "550e8400-e29b-41d4-a716-446655440001"],
    });

    expect(result).toEqual({ success: true });
    await flushAfterCallbacks();

    expect(dispatchNotifications).toHaveBeenCalledTimes(1);
    const [payload, actorUserId] = vi.mocked(dispatchNotifications).mock.calls[0];
    expect(payload.type).toBe(NotificationType.ConsultationAssigned);
    expect(payload.userIds).toEqual([uuid, "550e8400-e29b-41d4-a716-446655440001"]);
    expect(actorUserId).toBe("u1");
    expect(payload.consultationId).toBe(consultationRecord.id);
  });
});

describe("updateConsultationAction", () => {
  const validPayload = {
    consultationId: uuid,
    client_id: uuid,
    concern: "Legal advice",
    booking_datetime: "2024-06-01T10:00:00.000Z",
  };

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await updateConsultationAction({ consultationId: uuid } as any)).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid consultation data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("returns an error when the consultation is not found", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue(null);

    expect(await updateConsultationAction(validPayload)).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Consultation not found",
        description: "The consultation may have been deleted by another user.",
      },
    });
  });

  it("updates a consultation and revalidates", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-06-01T10:00:00.000Z"),
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });

    expect(await updateConsultationAction(validPayload)).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/consultation/${uuid}`);
    expect(revalidatePath).toHaveBeenCalledWith("/consultation");
  });

  it("does not clear last_reminded_at when booking is unchanged", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-06-01T10:00:00.000Z"),
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });

    expect(await updateConsultationAction(validPayload)).toEqual({ success: true });

    expect(prisma.consultation.update).toHaveBeenCalledWith({
      where: { id: uuid },
      data: expect.any(Object),
      select: { id: true },
    });
    expect(vi.mocked(prisma.consultation.update).mock.calls[0][0].data).not.toHaveProperty(
      "last_reminded_at",
    );
  });

  it("returns an error when update fails", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-06-01T10:00:00.000Z"),
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(prisma.consultation.update).mockRejectedValue(new Error("db error"));

    expect(await updateConsultationAction(validPayload)).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to update consultation",
        description: "Something went wrong on our end. Please try again.",
      },
    });
  });

  it("refuses booking changes once the consultation is no longer scheduled", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-05-01T10:00:00.000Z"),
      status: "Completed",
      assignee_ids: [],
      assignees: [],
    });

    expect(await updateConsultationAction(validPayload)).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Booking date is locked",
        description:
          "The booking date can only change while a consultation is scheduled. This consultation is Completed.",
      },
    });
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });

  it("refuses rescheduling to a past date", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-05-01T10:00:00.000Z"),
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });

    expect(await updateConsultationAction(validPayload)).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Booking date is in the past",
        description:
          "The booking date cannot be in the past. Choose a future date, or mark the consultation as Completed if the meeting already happened.",
      },
    });
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });

  it("allows rescheduling to earlier today", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-05-01T10:00:00.000Z"),
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(prisma.consultation.update).mockResolvedValue(consultationRecord);

    expect(
      await updateConsultationAction({
        ...validPayload,
        booking_datetime: getStartOfDay(new Date()),
      }),
    ).toEqual({ success: true });
  });

  it("refuses field edits on an accepted consultation with a linked case", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: consultationRecord.booking_datetime,
      status: "Accepted",
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(hasLinkedCase).mockResolvedValue(true);

    expect(await updateConsultationAction(validPayload)).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Consultation already accepted",
        description:
          "This consultation has been accepted and linked to a case. Update the case instead.",
      },
    });
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });

  it("still allows field edits on an accepted consultation without a linked case", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-06-01T10:00:00.000Z"),
      status: "Accepted",
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(hasLinkedCase).mockResolvedValue(false);
    vi.mocked(prisma.consultation.update).mockResolvedValue(consultationRecord);

    expect(await updateConsultationAction(validPayload)).toEqual({ success: true });
  });
});

describe("deleteConsultationAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteConsultationAction({ consultationId: "abc" })).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid consultation data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("returns an error when the consultation is not found", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue(null);

    expect(await deleteConsultationAction({ consultationId: uuid })).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Consultation not found",
        description: "The consultation may have been deleted by another user.",
      },
    });
  });

  it("deletes a consultation and revalidates the list", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: "1",
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: consultationRecord.booking_datetime,
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });

    expect(await deleteConsultationAction({ consultationId: uuid })).toEqual({ success: true });
    expect(prisma.consultation.delete).toHaveBeenCalledWith({
      where: { id: uuid },
      select: { id: true },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/consultation");
  });

  it("returns a failure status when the underlying delete throws", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: "1",
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: consultationRecord.booking_datetime,
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(deleteDocumentFiles).mockRejectedValue(new Error("S3 unavailable"));

    expect(await deleteConsultationAction({ consultationId: uuid })).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to delete consultation",
        description: "Something went wrong on our end. Please try again.",
      },
    });
  });

  it("returns not_found when the consultation is deleted concurrently", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: "1",
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: consultationRecord.booking_datetime,
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(prisma.consultation.delete).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "test",
      }),
    );

    expect(await deleteConsultationAction({ consultationId: uuid })).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Consultation not found",
        description: "The consultation may have been deleted by another user.",
      },
    });
  });
});

describe("authorization guards for non-Admin users", () => {
  const updatePayload = {
    consultationId: uuid,
    client_id: uuid,
    concern: "Legal advice",
    booking_datetime: "2024-06-01T10:00:00.000Z",
    status: "Scheduled" as const,
  };

  const updateWithClientPayload = {
    consultation_id: uuid,
    client_id: uuid,
    client: { name: "John Doe", phone_number: "09170000001" },
    consultation: {
      concern: "Legal advice",
      booking_datetime: "2024-06-01T10:00:00.000Z",
    },
  };

  const createWithClientPayload = {
    client_id: uuid,
    client: { name: "John Doe", phone_number: "09170000001" },
    consultation: {
      concern: "Legal advice",
      booking_datetime: "2024-06-01T10:00:00.000Z",
      status: "Scheduled" as const,
    },
  };

  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Lawyer,
      name: "n2",
    });
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: "1",
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: consultationRecord.booking_datetime,
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });
  });

  afterEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u1",
      email: "e",
      role: Role.Admin,
      name: "n",
    });
  });

  it("returns forbidden envelope from updateConsultationAction when not assigned and not the owner", async () => {
    expect(await updateConsultationAction(updatePayload)).toEqual({
      success: false,
      error: { code: "forbidden", title: "Access denied", description: FORBIDDEN_MESSAGE },
    });
  });

  it("returns forbidden envelope from updateConsultationWithClientAction when not assigned and not the owner", async () => {
    expect(await updateConsultationWithClientAction(updateWithClientPayload)).toEqual({
      success: false,
      error: { code: "forbidden", title: "Access denied", description: FORBIDDEN_MESSAGE },
    });
  });

  it("returns forbidden envelope from deleteConsultationAction when not assigned and not the owner", async () => {
    expect(await deleteConsultationAction({ consultationId: uuid })).toEqual({
      success: false,
      error: { code: "forbidden", title: "Access denied", description: FORBIDDEN_MESSAGE },
    });
  });

  it("returns forbidden envelope from createConsultationWithClientAction when the role lacks consultation.create", async () => {
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError());

    expect(await createConsultationWithClientAction(createWithClientPayload)).toEqual({
      success: false,
      error: { code: "forbidden", title: "Access denied", description: FORBIDDEN_MESSAGE },
    });
  });
});

describe("updateConsultationAction notification split", () => {
  const validPayload = {
    consultationId: uuid,
    client_id: uuid,
    concern: "Legal advice",
    booking_datetime: "2024-06-01T10:00:00.000Z",
  };

  const assignee1 = uuid;
  const assignee2 = "550e8400-e29b-41d4-a716-446655440001";
  const assignee3 = "550e8400-e29b-41d4-a716-446655440002";

  const existingEditData = {
    id: "1",
    client_id: uuid,
    concern: "Legal advice",
    booking_datetime: new Date("2024-06-01T10:00:00.000Z"),
    status: "Scheduled" as const,
    assignee_ids: [assignee1, assignee2],
    assignees: [],
  };

  beforeEach(() => {
    vi.mocked(getConsultationEditData).mockResolvedValue(existingEditData);
    vi.mocked(getConsultationAssigneeIds).mockResolvedValue([assignee1, assignee2, assignee3]);
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationRecord);
    vi.mocked(prisma.consultation.update).mockResolvedValue(consultationRecord);
  });

  it("dispatches ConsultationAssigned only to the new assignee", async () => {
    await updateConsultationAction({
      ...validPayload,
      assignee_ids: [assignee1, assignee2, assignee3],
    });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const assigned = calls.find(
      ([payload]) => payload.type === NotificationType.ConsultationAssigned,
    );

    expect(calls).toHaveLength(1);
    expect(assigned?.[0].userIds).toEqual([assignee3]);
  });

  it("dispatches nothing when no assignee was added", async () => {
    vi.mocked(getConsultationAssigneeIds).mockResolvedValue([assignee1, assignee2]);

    await updateConsultationAction(validPayload);
    await flushAfterCallbacks();

    expect(vi.mocked(dispatchNotifications)).not.toHaveBeenCalled();
  });

  it("dispatches ConsultationRescheduled when the booking changes", async () => {
    await updateConsultationAction({
      ...validPayload,
      booking_datetime: "2099-06-05T10:00:00.000Z",
    });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const rescheduled = calls.find(
      ([payload]) => payload.type === NotificationType.ConsultationRescheduled,
    );

    expect(rescheduled?.[0].userIds).toEqual([assignee1, assignee2, assignee3]);
    expect(rescheduled?.[0].message).toContain("rescheduled");
  });

  it("dispatches ConsultationAssigned only for updateConsultationWithClientAction", async () => {
    await updateConsultationWithClientAction({
      consultation_id: uuid,
      client_id: uuid,
      client: { name: "John Doe", phone_number: "09170000001" },
      consultation: {
        concern: "Legal advice",
        booking_datetime: "2024-06-01T10:00:00.000Z",
        assignee_ids: [assignee1, assignee2, assignee3],
      },
    });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const assigned = calls.find(
      ([payload]) => payload.type === NotificationType.ConsultationAssigned,
    );

    expect(calls).toHaveLength(1);
    expect(assigned?.[0].userIds).toEqual([assignee3]);
  });
});

describe("changeConsultationStatusAction", () => {
  const assignee1 = uuid;
  const assignee2 = "550e8400-e29b-41d4-a716-446655440001";

  const existingEditData = {
    id: "1",
    client_id: uuid,
    concern: "Legal advice",
    booking_datetime: new Date(),
    status: "Scheduled" as const,
    assignee_ids: [assignee1, assignee2],
    assignees: [],
  };

  beforeEach(() => {
    vi.mocked(getConsultationEditData).mockResolvedValue(existingEditData);
    vi.mocked(getConsultationAssigneeIds).mockResolvedValue([assignee1, assignee2]);
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationRecord);
    vi.mocked(prisma.consultation.update).mockResolvedValue(consultationRecord);
    vi.mocked(prisma.consultation.updateMany).mockResolvedValue({ count: 1 });
  });

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await changeConsultationStatusAction({ consultationId: uuid } as any)).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid consultation data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("returns an error when the consultation is not found", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue(null);

    expect(
      await changeConsultationStatusAction({ consultationId: uuid, status: "Completed" }),
    ).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Consultation not found",
        description: "The consultation may have been deleted by another user.",
      },
    });
  });

  it("returns an error for an invalid transition", async () => {
    expect(
      await changeConsultationStatusAction({ consultationId: uuid, status: "Rejected" }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Invalid status change",
        description:
          "Cannot change a consultation from Scheduled to Rejected. From Scheduled, you can: mark it completed or cancel it.",
      },
    });
  });

  it("refuses a direct accept outside the case flow", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...existingEditData,
      status: "Completed",
    });

    expect(
      await changeConsultationStatusAction({ consultationId: uuid, status: "Accepted" }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Accept from the consultation page",
        description:
          "Accepting creates the linked case in the same step. Open the consultation and click the Accept button to continue.",
      },
    });
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });

  it("allows rebooking a cancelled consultation", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...existingEditData,
      status: "Cancelled",
      booking_datetime: new Date(Date.now() + 86400000),
    });

    expect(
      await changeConsultationStatusAction({ consultationId: uuid, status: "Scheduled" }),
    ).toEqual({ success: true });
    expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
      where: { id: uuid, status: "Cancelled" },
      data: { status: "Scheduled" },
    });
  });

  it("names rebooking as the only move from a cancelled consultation", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...existingEditData,
      status: "Cancelled",
    });

    expect(
      await changeConsultationStatusAction({ consultationId: uuid, status: "Completed" }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Invalid status change",
        description:
          "Cannot change a consultation from Cancelled to Completed. From Cancelled, you can: rebook it.",
      },
    });
  });

  it("names the closed state when leaving a terminal status", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...existingEditData,
      status: "Accepted",
    });

    expect(
      await changeConsultationStatusAction({ consultationId: uuid, status: "Completed" }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Invalid status change",
        description:
          "Cannot change a consultation from Accepted to Completed. From Accepted, you can: nothing — this consultation is closed.",
      },
    });
  });

  it("dispatches ConsultationStatusChanged on status change", async () => {
    await changeConsultationStatusAction({ consultationId: uuid, status: "Completed" });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const statusChange = calls.find(
      ([payload]) => payload.type === NotificationType.ConsultationStatusChanged,
    );

    expect(calls).toHaveLength(1);
    expect(statusChange?.[0].userIds).toEqual([assignee1, assignee2]);
    expect(statusChange?.[0].message).toContain("Scheduled");
    expect(statusChange?.[0].message).toContain("Completed");
  });

  it("saves a rejection reason as a note", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...existingEditData,
      status: "Completed",
    });

    expect(
      await changeConsultationStatusAction({
        consultationId: uuid,
        status: "Rejected",
        reason: "No merit",
      }),
    ).toEqual({ success: true });
    expect(prisma.note.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: "Rejection reason: No merit",
        consultation_id: uuid,
        created_by_user_id: "u1",
      }),
      select: { id: true },
    });
  });

  it("saves a cancellation reason as a note", async () => {
    expect(
      await changeConsultationStatusAction({
        consultationId: uuid,
        status: "Cancelled",
        reason: "Client no-show",
      }),
    ).toEqual({ success: true });
    expect(prisma.note.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ content: "Cancellation reason: Client no-show" }),
      select: { id: true },
    });
  });

  it("skips the note when rejecting without a reason", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...existingEditData,
      status: "Completed",
    });

    expect(
      await changeConsultationStatusAction({ consultationId: uuid, status: "Rejected" }),
    ).toEqual({ success: true });
    expect(prisma.note.create).not.toHaveBeenCalled();
  });
});

describe("updateConsultationWithClientAction booking lock", () => {
  it("refuses booking changes once the consultation is no longer scheduled", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-05-01T10:00:00.000Z"),
      status: "Completed",
      assignee_ids: [],
      assignees: [],
    });

    expect(
      await updateConsultationWithClientAction({
        consultation_id: uuid,
        client_id: uuid,
        client: { name: "John Doe", phone_number: "09170000001" },
        consultation: {
          concern: "Legal advice",
          booking_datetime: "2024-06-01T10:00:00.000Z",
          assignee_ids: [],
        },
      }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Booking date is locked",
        description:
          "The booking date can only change while a consultation is scheduled. This consultation is Completed.",
      },
    });
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });

  it("refuses rescheduling to a past date", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-05-01T10:00:00.000Z"),
      status: "Scheduled",
      assignee_ids: [],
      assignees: [],
    });

    expect(
      await updateConsultationWithClientAction({
        consultation_id: uuid,
        client_id: uuid,
        client: { name: "John Doe", phone_number: "09170000001" },
        consultation: {
          concern: "Legal advice",
          booking_datetime: "2024-06-01T10:00:00.000Z",
          assignee_ids: [],
        },
      }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Booking date is in the past",
        description:
          "The booking date cannot be in the past. Choose a future date, or mark the consultation as Completed if the meeting already happened.",
      },
    });
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });

  it("refuses field edits on an accepted consultation with a linked case", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: consultationRecord.booking_datetime,
      status: "Accepted",
      assignee_ids: [],
      assignees: [],
    });
    vi.mocked(hasLinkedCase).mockResolvedValue(true);

    expect(
      await updateConsultationWithClientAction({
        consultation_id: uuid,
        client_id: uuid,
        client: { name: "John Doe", phone_number: "09170000001" },
        consultation: {
          concern: "Legal advice",
          booking_datetime: consultationRecord.booking_datetime.toISOString(),
          assignee_ids: [],
        },
      }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Consultation already accepted",
        description:
          "This consultation has been accepted and linked to a case. Update the case instead.",
      },
    });
    expect(prisma.consultation.update).not.toHaveBeenCalled();
  });
});

describe("acceptConsultationWithCaseAction", () => {
  const acceptPayload = {
    consultationId: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open" as const,
  };

  function completedEditData() {
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

  const linkedCaseRecord = {
    id: "case-1",
    client_id: uuid,
    created_by_user_id: "u1",
    status: "Open" as const,
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    source_consultation_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    parties_involved: null,
  };

  beforeEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u1",
      email: "e",
      role: Role.Admin,
      name: "n",
    });
    vi.mocked(requirePermission).mockResolvedValue({
      id: "u1",
      email: "e",
      role: Role.Admin,
      name: "n",
    });
    vi.mocked(getConsultationEditData).mockResolvedValue(completedEditData());
    vi.mocked(hasLinkedCase).mockResolvedValue(false);
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      ...consultationRecord,
      status: "Completed",
    });
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.case.create).mockResolvedValue(linkedCaseRecord);
  });

  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await acceptConsultationWithCaseAction({} as any)).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid case data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
  });

  it("returns an error when the consultation is not found", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue(null);

    expect(await acceptConsultationWithCaseAction(acceptPayload)).toEqual({
      success: false,
      error: {
        code: "not_found",
        title: "Consultation not found",
        description: "The consultation may have been deleted by another user.",
      },
    });
  });

  it("denies users without consultation update access", async () => {
    vi.mocked(requireAuth).mockResolvedValueOnce({
      id: "u2",
      email: "e",
      role: Role.Paralegal,
      name: "n",
    });

    expect(await acceptConsultationWithCaseAction(acceptPayload)).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
    });
    expect(prisma.case.create).not.toHaveBeenCalled();
  });

  it("refuses when a case already exists", async () => {
    vi.mocked(hasLinkedCase).mockResolvedValue(true);

    expect(await acceptConsultationWithCaseAction(acceptPayload)).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Case already exists",
        description:
          "A case already exists for this consultation. Open the linked case from the consultation page instead.",
      },
    });
    expect(prisma.case.create).not.toHaveBeenCalled();
  });

  it("refuses a consultation that is not completed", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...completedEditData(),
      status: "Scheduled",
    });

    expect(await acceptConsultationWithCaseAction(acceptPayload)).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Consultation cannot be accepted",
        description:
          "Only completed consultations can be accepted. This consultation is scheduled. Mark it as completed first.",
      },
    });
    expect(prisma.case.create).not.toHaveBeenCalled();
  });

  it("accepts and creates the case atomically", async () => {
    expect(await acceptConsultationWithCaseAction(acceptPayload)).toEqual({
      success: true,
      data: { caseId: "case-1" },
    });
    expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
      where: { id: uuid, status: "Completed" },
      data: { status: "Accepted" },
    });
    expect(prisma.case.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        client_id: uuid,
        source_consultation_id: uuid,
        created_by_user_id: "u1",
      }),
      select: { id: true },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/case");
  });

  it("heals an accepted consultation that has no case yet", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      ...completedEditData(),
      status: "Accepted",
    });
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
      ...consultationRecord,
      status: "Accepted",
    });

    expect(await acceptConsultationWithCaseAction(acceptPayload)).toEqual({
      success: true,
      data: { caseId: "case-1" },
    });
  });

  it("maps a duplicate-link race to the friendly conflict", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue({ ...linkedCaseRecord, id: "existing-1" });

    expect(await acceptConsultationWithCaseAction(acceptPayload)).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Case already exists",
        description:
          "A case already exists for this consultation. Open the linked case from the consultation page instead.",
      },
    });
  });
});
