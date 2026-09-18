import { beforeEach, expect, it, vi } from "vitest";

import { getDocumentFilePathsForCaseDeletion } from "@/features/documents/queries";
import { prisma } from "@/lib/prisma";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import {
  createCase,
  deleteCase,
  transitionCaseWithNote,
  updateCase,
  updateCaseStatus,
} from "../mutations";

interface MockCasePrisma {
  case: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  note: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
}

vi.mock("@/lib/prisma", () => {
  const caseModel = { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn() };
  const note = { create: vi.fn() };
  const prisma: MockCasePrisma = {
    case: caseModel,
    note,
    $transaction: vi.fn((fn: (tx: MockCasePrisma) => Promise<unknown>) => fn(prisma)),
  };
  return { prisma };
});

vi.mock("@/features/documents/queries", () => ({
  getDocumentFilePathsForCaseDeletion: vi.fn(),
}));

vi.mock("@/lib/storage-cleanup", () => ({
  deleteDocumentFiles: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

beforeEach(() => {
  vi.clearAllMocks();
});

it("createCase merges created_by_user_id into the create payload", async () => {
  await createCase({
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
    created_by_user_id: "u1",
  });

  expect(prisma.case.create).toHaveBeenCalledWith({
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("updateCase strips id and maps empty parties_involved to null", async () => {
  await updateCase({
    caseId: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    parties_involved: "",
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      parties_involved: null,
    },
    select: { id: true },
  });
});

it("updateCase passes a defined parties_involved through", async () => {
  await updateCase({
    caseId: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    parties_involved: "Smith (Plaintiff)",
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      parties_involved: "Smith (Plaintiff)",
    },
    select: { id: true },
  });
});

it("createCase passes through parties_involved and source_consultation_id when provided", async () => {
  await createCase({
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
    parties_involved: "Smith (Plaintiff)",
    source_consultation_id: uuid,
    created_by_user_id: "u1",
  });

  expect(prisma.case.create).toHaveBeenCalledWith({
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: "Smith (Plaintiff)",
      source_consultation_id: uuid,
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("updateCase passes through source_consultation_id", async () => {
  await updateCase({
    caseId: uuid,
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    source_consultation_id: uuid,
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      source_consultation_id: uuid,
      parties_involved: null,
    },
    select: { id: true },
  });
});

it("updateCaseStatus updates only the status", async () => {
  await updateCaseStatus(uuid, "Closed");

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: { status: "Closed" },
    select: { id: true },
  });
});

it("updateCaseStatus with expectedStatus rejects when another transition won the race", async () => {
  vi.mocked(prisma.case.updateMany).mockResolvedValue({ count: 0 });

  await expect(updateCaseStatus(uuid, "Closed", "Open")).rejects.toThrow(
    "Record changed by another user",
  );
  expect(prisma.case.updateMany).toHaveBeenCalledWith({
    where: { id: uuid, status: "Open" },
    data: { status: "Closed" },
  });
});

it("transitionCaseWithNote saves the reason as a note", async () => {
  await transitionCaseWithNote({
    caseId: uuid,
    status: "Settled",
    reason: "Compromise agreement signed",
    decidedByUserId: "u1",
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: { status: "Settled" },
    select: { id: true },
  });
  expect(prisma.note.create).toHaveBeenCalledWith({
    data: {
      content: "Settlement reason: Compromise agreement signed",
      case_id: uuid,
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("transitionCaseWithNote labels closing and termination reasons", async () => {
  await transitionCaseWithNote({
    caseId: uuid,
    status: "Closed",
    reason: "Judgment entered",
    decidedByUserId: "u1",
  });

  expect(prisma.note.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ content: "Closing reason: Judgment entered" }),
    select: { id: true },
  });

  await transitionCaseWithNote({
    caseId: uuid,
    status: "Terminated",
    reason: "Client withdrew",
    decidedByUserId: "u1",
  });

  expect(prisma.note.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ content: "Termination reason: Client withdrew" }),
    select: { id: true },
  });
});

it("transitionCaseWithNote skips the note without a reason", async () => {
  await transitionCaseWithNote({
    caseId: uuid,
    status: "Closed",
    decidedByUserId: "u1",
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: { status: "Closed" },
    select: { id: true },
  });
  expect(prisma.note.create).not.toHaveBeenCalled();
});

it("deletes the case then purges its S3 documents", async () => {
  vi.mocked(getDocumentFilePathsForCaseDeletion).mockResolvedValue(["cases/c1/a.pdf"]);
  vi.mocked(deleteDocumentFiles).mockResolvedValue(undefined);

  await deleteCase(uuid);

  expect(getDocumentFilePathsForCaseDeletion).toHaveBeenCalledWith(uuid);
  expect(prisma.case.delete).toHaveBeenCalledWith({ where: { id: uuid }, select: { id: true } });
  expect(deleteDocumentFiles).toHaveBeenCalledWith(["cases/c1/a.pdf"]);
  expect(deleteDocumentFiles).toHaveBeenCalledAfter(vi.mocked(prisma.case.delete));
});

it("propagates error when deleting the case record fails", async () => {
  const error = new Error("DB down");
  vi.mocked(getDocumentFilePathsForCaseDeletion).mockResolvedValue(["cases/c1/a.pdf"]);
  vi.mocked(prisma.case.delete).mockRejectedValue(error);

  await expect(deleteCase(uuid)).rejects.toThrow(error);
});
