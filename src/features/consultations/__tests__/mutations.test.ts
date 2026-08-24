import { beforeEach, expect, it, vi } from "vitest";

import { getDocumentFilePathsByConsultationId } from "@/features/documents/queries";
import { prisma } from "@/lib/prisma";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import { createConsultation, deleteConsultation, updateConsultation } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    consultation: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock("@/features/documents/queries", () => ({
  getDocumentFilePathsByConsultationId: vi.fn(),
}));

vi.mock("@/lib/storage-cleanup", () => ({
  deleteDocumentFiles: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";
const booking = new Date("2024-07-15T10:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
});

it("createConsultation merges created_by_user_id into the create payload", async () => {
  await createConsultation({
    client_id: uuid,
    concern: "Breach of contract",
    booking_datetime: booking,
    status: "Scheduled",
    created_by_user_id: "u1",
  });

  expect(prisma.consultation.create).toHaveBeenCalledWith({
    data: {
      client_id: uuid,
      concern: "Breach of contract",
      booking_datetime: booking,
      status: "Scheduled",
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("updateConsultation strips id from the update data", async () => {
  await updateConsultation({
    consultationId: uuid,
    client_id: uuid,
    concern: "Breach of contract",
    booking_datetime: booking,
    status: "Scheduled",
  });

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      concern: "Breach of contract",
      booking_datetime: booking,
      status: "Scheduled",
    },
    select: { id: true },
  });
});

it("deletes the consultation then purges its S3 documents", async () => {
  vi.mocked(getDocumentFilePathsByConsultationId).mockResolvedValue(["consultations/con1/a.pdf"]);
  vi.mocked(deleteDocumentFiles).mockResolvedValue(undefined);

  await deleteConsultation(uuid);

  expect(getDocumentFilePathsByConsultationId).toHaveBeenCalledWith(uuid);
  expect(prisma.consultation.delete).toHaveBeenCalledWith({
    where: { id: uuid },
    select: { id: true },
  });
  expect(deleteDocumentFiles).toHaveBeenCalledWith(["consultations/con1/a.pdf"]);
  expect(deleteDocumentFiles).toHaveBeenCalledAfter(vi.mocked(prisma.consultation.delete));
});

it("propagates error when deleting the consultation record fails", async () => {
  const error = new Error("DB down");
  vi.mocked(getDocumentFilePathsByConsultationId).mockResolvedValue(["consultations/con1/a.pdf"]);
  vi.mocked(prisma.consultation.delete).mockRejectedValue(error);

  await expect(deleteConsultation(uuid)).rejects.toThrow(error);
});

it("createConsultation nests consultationAssignments when assignee_ids are provided", async () => {
  await createConsultation({
    client_id: uuid,
    concern: "Breach of contract",
    booking_datetime: booking,
    status: "Scheduled",
    assignee_ids: ["u1", "u2"],
    created_by_user_id: "u1",
  });

  expect(prisma.consultation.create).toHaveBeenCalledWith({
    data: {
      client_id: uuid,
      concern: "Breach of contract",
      booking_datetime: booking,
      status: "Scheduled",
      created_by_user_id: "u1",
      consultationAssignments: {
        create: [{ user_id: "u1" }, { user_id: "u2" }],
      },
    },
    select: { id: true },
  });
});

it("updateConsultation replaces consultationAssignments when assignee_ids are provided", async () => {
  await updateConsultation({
    consultationId: uuid,
    client_id: uuid,
    concern: "Breach of contract",
    booking_datetime: booking,
    status: "Scheduled",
    assignee_ids: ["u2"],
  });

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      concern: "Breach of contract",
      booking_datetime: booking,
      status: "Scheduled",
      consultationAssignments: {
        deleteMany: {},
        create: [{ user_id: "u2" }],
      },
    },
    select: { id: true },
  });
});

it("updateConsultation clears last_reminded_at when resetReminderTiming is set", async () => {
  await updateConsultation({
    consultationId: uuid,
    client_id: uuid,
    concern: "Breach of contract",
    booking_datetime: booking,
    status: "Scheduled",
    resetReminderTiming: true,
  });

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: expect.objectContaining({
      last_reminded_at: null,
    }),
    select: { id: true },
  });
});

it("updateConsultation omits last_reminded_at when resetReminderTiming is not set", async () => {
  await updateConsultation({
    consultationId: uuid,
    client_id: uuid,
    concern: "Breach of contract",
    booking_datetime: booking,
    status: "Scheduled",
  });

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: expect.any(Object),
    select: { id: true },
  });
  expect(vi.mocked(prisma.consultation.update).mock.calls[0][0].data).not.toHaveProperty(
    "last_reminded_at",
  );
});
