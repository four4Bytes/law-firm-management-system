import { revalidatePath } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role, type Consultation } from "@/generated/prisma/browser";
import { requireAuth, requirePermissionOrNull } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { can, FORBIDDEN_MESSAGE } from "@/lib/rbac";

import {
  createConsultationAction,
  createConsultationWithClientAction,
  deleteConsultationAction,
  getConsultationForEditAction,
  updateConsultationAction,
  updateConsultationWithClientAction,
} from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: Role.Admin, name: "n" }),
  requirePermissionOrNull: vi
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

vi.mock("next/server", () => ({
  after: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consultation: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
    consultationAssignment: { findFirst: vi.fn() },
  },
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
});

describe("getConsultationForEditAction", () => {
  it("returns edit data for a valid id", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationRecord);

    const result = await getConsultationForEditAction(uuid);

    expect(result).toEqual({
      id: "1",
      client_id: uuid,
      concern: "Legal advice",
      booking_datetime: consultationRecord.booking_datetime,
      status: "Scheduled",
      assignee_ids: [],
    });
    expect(prisma.consultation.findUnique).toHaveBeenLastCalledWith({
      where: { id: uuid },
      select: {
        id: true,
        client_id: true,
        concern: true,
        booking_datetime: true,
        status: true,
        consultationAssignments: {
          select: { user_id: true },
        },
      },
    });
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
      error: "Invalid consultation data",
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
  });

  it("returns an error when creation fails", async () => {
    vi.mocked(prisma.consultation.create).mockRejectedValue(new Error("db error"));

    expect(await createConsultationAction(validPayload)).toEqual({
      success: false,
      error: "Failed to create consultation",
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
      error: "Invalid consultation data",
    });
  });

  it("returns an error when the consultation is not found", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(null);

    expect(await updateConsultationAction(validPayload)).toEqual({
      success: false,
      error: "Consultation not found",
    });
  });

  it("updates a consultation and revalidates", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationRecord);

    expect(await updateConsultationAction(validPayload)).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith(`/consultation/${uuid}`);
    expect(revalidatePath).toHaveBeenCalledWith("/consultation");
  });

  it("returns an error when update fails", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationRecord);
    vi.mocked(prisma.consultation.update).mockRejectedValue(new Error("db error"));

    expect(await updateConsultationAction(validPayload)).toEqual({
      success: false,
      error: "Failed to update consultation",
    });
  });
});

describe("deleteConsultationAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteConsultationAction({ consultationId: "abc" })).toEqual({
      success: false,
      error: "Invalid consultation ID",
    });
  });

  it("returns an error when the consultation is not found", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(null);

    expect(await deleteConsultationAction({ consultationId: uuid })).toEqual({
      success: false,
      error: "Consultation not found",
    });
  });

  it("deletes a consultation and revalidates the list", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationRecord);

    expect(await deleteConsultationAction({ consultationId: uuid })).toEqual({ success: true });
    expect(prisma.consultation.delete).toHaveBeenCalledWith({
      where: { id: uuid },
      select: { id: true },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/consultation");
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
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationRecord);
  });

  afterEach(() => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u1",
      email: "e",
      role: Role.Admin,
      name: "n",
    });
  });

  it("returns FORBIDDEN_MESSAGE from updateConsultationAction when not assigned and not the owner", async () => {
    expect(await updateConsultationAction(updatePayload)).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });

  it("returns FORBIDDEN_MESSAGE from updateConsultationWithClientAction when not assigned and not the owner", async () => {
    expect(await updateConsultationWithClientAction(updateWithClientPayload)).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });

  it("returns FORBIDDEN_MESSAGE from deleteConsultationAction when not assigned and not the owner", async () => {
    expect(await deleteConsultationAction({ consultationId: uuid })).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });

  it("returns FORBIDDEN_MESSAGE from createConsultationWithClientAction when the role lacks consultation.create", async () => {
    vi.mocked(requirePermissionOrNull).mockResolvedValue(null);

    expect(await createConsultationWithClientAction(createWithClientPayload)).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });
});
