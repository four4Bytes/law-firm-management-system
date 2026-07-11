import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Consultation } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import {
  createConsultationAction,
  deleteConsultationAction,
  getConsultationForEditAction,
  updateConsultationAction,
} from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consultation: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const consultationRecord: Consultation = {
  id: "1",
  client_id: uuid,
  concern: "Legal advice",
  booking_datetime: new Date("2024-06-01T10:00:00"),
  status: "Scheduled",
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getConsultationForEditAction", () => {
  it("returns edit data for a valid id", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationRecord);

    const result = await getConsultationForEditAction(uuid);

    expect(result).toEqual(consultationRecord);
    expect(prisma.consultation.findUnique).toHaveBeenCalledWith({
      where: { id: uuid },
      select: {
        id: true,
        client_id: true,
        concern: true,
        booking_datetime: true,
        status: true,
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
    status: "Scheduled",
  };

  it("returns an error for an invalid payload", async () => {
    expect(await createConsultationAction({})).toEqual({
      success: false,
      error: "Invalid consultation data",
    });
  });

  it("creates a consultation and revalidates the list", async () => {
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
});

describe("updateConsultationAction", () => {
  const validPayload = {
    id: uuid,
    client_id: uuid,
    concern: "Legal advice",
    booking_datetime: "2024-06-01T10:00:00.000Z",
    status: "Scheduled",
  };

  it("returns an error for an invalid payload", async () => {
    expect(await updateConsultationAction({ id: uuid })).toEqual({
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
    expect(await deleteConsultationAction({ id: "abc" })).toEqual({
      success: false,
      error: "Invalid consultation ID",
    });
  });

  it("returns an error when the consultation is not found", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(null);

    expect(await deleteConsultationAction({ id: uuid })).toEqual({
      success: false,
      error: "Consultation not found",
    });
  });

  it("deletes a consultation and revalidates the list", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationRecord);

    expect(await deleteConsultationAction({ id: uuid })).toEqual({ success: true });
    expect(prisma.consultation.delete).toHaveBeenCalledWith({ where: { id: uuid } });
    expect(revalidatePath).toHaveBeenCalledWith("/consultation");
  });
});
