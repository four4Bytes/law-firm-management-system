import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getConsultationAssigneeIds,
  getConsultationEditData,
} from "@/features/consultations/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { NotificationType, Role, type Consultation } from "@/generated/prisma/browser";
import { Prisma } from "@/generated/prisma/client";
import { requireAuth, requirePermission } from "@/lib/auth-guards";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { can, FORBIDDEN_MESSAGE } from "@/lib/rbac";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import {
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

vi.mock("@/features/documents/queries", () => ({
  getDocumentFilePathsByConsultationId: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/storage-cleanup", () => ({
  deleteDocumentFiles: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ count: 0 }),
}));

vi.mock("@/lib/prisma", () => {
  const consultation = { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() };
  const consultationAssignment = { findFirst: vi.fn(), findMany: vi.fn() };
  const client = { create: vi.fn(), update: vi.fn() };
  const prisma = {
    consultation,
    consultationAssignment,
    client,
    $transaction: vi.fn((fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
  };
  return { prisma };
});

vi.mock("@/features/consultations/queries", () => ({
  getConsultationEditData: vi.fn(),
  getConsultationAccessContext: vi.fn().mockResolvedValue({ assigned: false, own: false }),
  getConsultationAssigneeIds: vi.fn().mockResolvedValue([]),
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
  reminder_days: null,
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
      reminder_days: null,
      assignee_ids: [],
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
    booking_datetime: "2024-06-01T10:00:00.000Z",
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
});

describe("updateConsultationAction", () => {
  const validPayload = {
    consultationId: uuid,
    client_id: uuid,
    concern: "Legal advice",
    booking_datetime: "2024-06-01T10:00:00.000Z",
    status: "Scheduled" as const,
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
      booking_datetime: consultationRecord.booking_datetime,
      status: "Scheduled",
      reminder_days: null,
      assignee_ids: [],
    });

    expect(await updateConsultationAction(validPayload)).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/consultation/${uuid}`);
    expect(revalidatePath).toHaveBeenCalledWith("/consultation");
  });

  it("does not clear last_reminded_at when booking and reminder_days are unchanged", async () => {
    vi.mocked(getConsultationEditData).mockResolvedValue({
      id: uuid,
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: new Date("2024-06-01T10:00:00.000Z"),
      status: "Scheduled",
      reminder_days: null,
      assignee_ids: [],
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
      booking_datetime: consultationRecord.booking_datetime,
      status: "Scheduled",
      reminder_days: null,
      assignee_ids: [],
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
      reminder_days: null,
      assignee_ids: [],
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
      reminder_days: null,
      assignee_ids: [],
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
      reminder_days: null,
      assignee_ids: [],
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
    client: { name: "John Doe" },
    consultation: {
      concern: "Legal advice",
      booking_datetime: "2024-06-01T10:00:00.000Z",
      status: "Scheduled" as const,
    },
  };

  const createWithClientPayload = {
    client_id: uuid,
    client: { name: "John Doe" },
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
      reminder_days: null,
      assignee_ids: [],
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
    status: "Scheduled" as const,
  };

  const assignee1 = uuid;
  const assignee2 = "550e8400-e29b-41d4-a716-446655440001";
  const assignee3 = "550e8400-e29b-41d4-a716-446655440002";

  const existingEditData = {
    id: "1",
    client_id: uuid,
    concern: "Legal advice",
    booking_datetime: consultationRecord.booking_datetime,
    status: "Scheduled" as const,
    reminder_days: null,
    assignee_ids: [assignee1, assignee2],
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

  it("dispatches ConsultationAssigned only for updateConsultationWithClientAction", async () => {
    await updateConsultationWithClientAction({
      consultation_id: uuid,
      client_id: uuid,
      client: { name: "John Doe" },
      consultation: {
        concern: "Legal advice",
        booking_datetime: "2024-06-01T10:00:00.000Z",
        status: "Scheduled" as const,
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

  it("dispatches ConsultationStatusChanged on status change for updateConsultationAction", async () => {
    await updateConsultationAction({
      ...validPayload,
      status: "Accepted" as const,
    });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const statusChange = calls.find(
      ([payload]) => payload.type === NotificationType.ConsultationStatusChanged,
    );

    expect(calls).toHaveLength(1);
    expect(statusChange?.[0].userIds).toEqual([assignee1, assignee2, assignee3]);
    expect(statusChange?.[0].message).toContain("Scheduled");
    expect(statusChange?.[0].message).toContain("Accepted");
  });

  it("dispatches ConsultationStatusChanged on status change for updateConsultationWithClientAction", async () => {
    await updateConsultationWithClientAction({
      consultation_id: uuid,
      client_id: uuid,
      client: { name: "John Doe" },
      consultation: {
        concern: "Legal advice",
        booking_datetime: "2024-06-01T10:00:00.000Z",
        status: "Accepted" as const,
        assignee_ids: [assignee1, assignee2],
      },
    });
    await flushAfterCallbacks();

    const calls = vi.mocked(dispatchNotifications).mock.calls;
    const statusChange = calls.find(
      ([payload]) => payload.type === NotificationType.ConsultationStatusChanged,
    );

    expect(calls).toHaveLength(1);
    expect(statusChange?.[0].userIds).toEqual([assignee1, assignee2, assignee3]);
    expect(statusChange?.[0].message).toContain("Scheduled");
    expect(statusChange?.[0].message).toContain("Accepted");
  });
});
