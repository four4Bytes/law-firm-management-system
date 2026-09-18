import { beforeEach, expect, it, vi } from "vitest";

import { getDocumentFilePathsByConsultationId } from "@/features/documents/queries";
import { prisma } from "@/lib/prisma";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import {
  acceptConsultationWithCase,
  createConsultation,
  deleteConsultation,
  transitionConsultationWithNote,
  updateConsultation,
  updateConsultationStatus,
} from "../mutations";

interface MockConsultationPrisma {
  consultation: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  case: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  note: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
}

vi.mock("@/lib/prisma", () => {
  const consultation = {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
  };
  const caseModel = { findUnique: vi.fn(), create: vi.fn() };
  const note = { create: vi.fn() };
  const prisma: MockConsultationPrisma = {
    consultation,
    case: caseModel,
    note,
    $transaction: vi.fn((fn: (tx: MockConsultationPrisma) => Promise<unknown>) => fn(prisma)),
  };
  return { prisma };
});

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
  });

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      concern: "Breach of contract",
      booking_datetime: booking,
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
    assignee_ids: ["u2"],
  });

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      concern: "Breach of contract",
      booking_datetime: booking,
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

it("updateConsultationStatus updates only the status", async () => {
  await updateConsultationStatus(uuid, "Accepted");

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: { status: "Accepted" },
    select: { id: true },
  });
});

it("updateConsultationStatus with expectedStatus rejects when another transition won the race", async () => {
  vi.mocked(prisma.consultation.updateMany).mockResolvedValue({ count: 0 });

  await expect(updateConsultationStatus(uuid, "Completed", "Scheduled")).rejects.toThrow(
    "Record changed by another user",
  );
  expect(prisma.consultation.updateMany).toHaveBeenCalledWith({
    where: { id: uuid, status: "Scheduled" },
    data: { status: "Completed" },
  });
});

it("transitionConsultationWithNote saves the reason as a note", async () => {
  await transitionConsultationWithNote({
    consultationId: uuid,
    status: "Rejected",
    reason: "No merit",
    decidedByUserId: "u1",
  });

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: { status: "Rejected" },
    select: { id: true },
  });
  expect(prisma.note.create).toHaveBeenCalledWith({
    data: {
      content: "Rejection reason: No merit",
      consultation_id: uuid,
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("transitionConsultationWithNote labels a cancellation reason", async () => {
  await transitionConsultationWithNote({
    consultationId: uuid,
    status: "Cancelled",
    reason: "Client no-show",
    decidedByUserId: "u1",
  });

  expect(prisma.note.create).toHaveBeenCalledWith({
    data: {
      content: "Cancellation reason: Client no-show",
      consultation_id: uuid,
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("transitionConsultationWithNote skips the note without a reason", async () => {
  await transitionConsultationWithNote({
    consultationId: uuid,
    status: "Cancelled",
    decidedByUserId: "u1",
  });

  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: { status: "Cancelled" },
    select: { id: true },
  });
  expect(prisma.note.create).not.toHaveBeenCalled();
});

const completedSource = {
  id: uuid,
  client_id: uuid,
  concern: "Breach of contract",
  booking_datetime: booking,
  status: "Completed" as const,
  created_by_user_id: "u1",
  created_at: booking,
  updated_at: booking,
  last_reminded_at: null,
};

const existingCase = {
  id: "existing-1",
  client_id: uuid,
  created_by_user_id: "u1",
  status: "Open" as const,
  created_at: booking,
  updated_at: booking,
  source_consultation_id: uuid,
  case_title: "Smith vs Jones",
  case_type: "Civil",
  parties_involved: null,
};

it("acceptConsultationWithCase flips status and creates the case in one transaction", async () => {
  vi.mocked(prisma.consultation.findUnique).mockResolvedValue(completedSource);
  vi.mocked(prisma.case.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.case.create).mockResolvedValue({ ...existingCase, id: "case-1" });

  const result = await acceptConsultationWithCase({
    consultationId: uuid,
    caseTitle: "Smith vs Jones",
    caseType: "Civil",
    status: "Open",
    createdByUserId: "u1",
  });

  expect(result).toEqual({ caseId: "case-1" });
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  expect(prisma.consultation.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: { status: "Accepted" },
    select: { id: true },
  });
  expect(prisma.case.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      client_id: uuid,
      source_consultation_id: uuid,
      created_by_user_id: "u1",
    }),
    select: { id: true },
  });
});

it("acceptConsultationWithCase throws when the consultation is missing", async () => {
  vi.mocked(prisma.consultation.findUnique).mockResolvedValue(null);

  await expect(
    acceptConsultationWithCase({
      consultationId: uuid,
      caseTitle: "Smith vs Jones",
      caseType: "Civil",
      status: "Open",
      createdByUserId: "u1",
    }),
  ).rejects.toThrow("Consultation not found");
  expect(prisma.consultation.update).not.toHaveBeenCalled();
  expect(prisma.case.create).not.toHaveBeenCalled();
});

it("acceptConsultationWithCase throws when a case already exists", async () => {
  vi.mocked(prisma.consultation.findUnique).mockResolvedValue(completedSource);
  vi.mocked(prisma.case.findUnique).mockResolvedValue(existingCase);

  await expect(
    acceptConsultationWithCase({
      consultationId: uuid,
      caseTitle: "Smith vs Jones",
      caseType: "Civil",
      status: "Open",
      createdByUserId: "u1",
    }),
  ).rejects.toThrow("A case already exists for this consultation");
  expect(prisma.consultation.update).not.toHaveBeenCalled();
  expect(prisma.case.create).not.toHaveBeenCalled();
});

it("acceptConsultationWithCase throws for a non-completed consultation", async () => {
  vi.mocked(prisma.consultation.findUnique).mockResolvedValue({
    ...completedSource,
    status: "Scheduled",
  });
  vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

  await expect(
    acceptConsultationWithCase({
      consultationId: uuid,
      caseTitle: "Smith vs Jones",
      caseType: "Civil",
      status: "Open",
      createdByUserId: "u1",
    }),
  ).rejects.toThrow("Consultation cannot be accepted");
  expect(prisma.consultation.update).not.toHaveBeenCalled();
  expect(prisma.case.create).not.toHaveBeenCalled();
});
