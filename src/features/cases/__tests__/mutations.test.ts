import { beforeEach, expect, it, vi } from "vitest";

import { getDocumentFilePathsForCaseDeletion } from "@/features/documents/queries";
import { prisma } from "@/lib/prisma";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import { createCase, deleteCase, updateCase } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    case: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

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
    status: "Open",
    parties_involved: "",
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
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
    status: "Open",
    parties_involved: "Smith (Plaintiff)",
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
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
    status: "Open",
    source_consultation_id: uuid,
  });

  expect(prisma.case.update).toHaveBeenCalledWith({
    where: { id: uuid },
    data: {
      client_id: uuid,
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      source_consultation_id: uuid,
      parties_involved: null,
    },
    select: { id: true },
  });
});

it("purges the case's S3 documents before deleting the case", async () => {
  vi.mocked(getDocumentFilePathsForCaseDeletion).mockResolvedValue(["cases/c1/a.pdf"]);
  vi.mocked(deleteDocumentFiles).mockResolvedValue(undefined);

  await deleteCase(uuid);

  expect(getDocumentFilePathsForCaseDeletion).toHaveBeenCalledWith(uuid);
  expect(deleteDocumentFiles).toHaveBeenCalledWith(["cases/c1/a.pdf"]);
  expect(deleteDocumentFiles).toHaveBeenCalledBefore(vi.mocked(prisma.case.delete));
  expect(prisma.case.delete).toHaveBeenCalledWith({ where: { id: uuid }, select: { id: true } });
});

it("aborts the case delete when an S3 document cannot be removed", async () => {
  const error = new Error("S3 unavailable");
  vi.mocked(getDocumentFilePathsForCaseDeletion).mockResolvedValue(["cases/c1/a.pdf"]);
  vi.mocked(deleteDocumentFiles).mockRejectedValue(error);

  await expect(deleteCase(uuid)).rejects.toThrow(error);
  expect(prisma.case.delete).not.toHaveBeenCalled();
});
