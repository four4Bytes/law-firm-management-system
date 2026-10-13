import { beforeEach, expect, it, vi } from "vitest";

import { prisma } from "@/lib/infra/prisma";
import { deleteFile, listObjects } from "@/lib/infra/s3";

import {
  createDocument,
  createDocumentForSubtask,
  deleteDocument,
  deleteDocumentForSubtask,
  runStorageGc,
} from "../mutations";

vi.mock("@/lib/infra/prisma", () => ({
  prisma: {
    document: {
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/infra/s3", () => ({
  deleteFile: vi.fn(),
  listObjects: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it("creates a document", async () => {
  vi.mocked(prisma.document.create).mockResolvedValue({
    id: "d1",
    file_name: "complaint.pdf",
    file_path: "uploads/complaint.pdf",
    file_type: "application/pdf",
    file_size: 2500000,
    case_id: "c1",
    consultation_id: null,
    task_id: null,
    subtask_id: null,
    uploaded_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  });

  const result = await createDocument({
    file_name: "complaint.pdf",
    file_path: "uploads/complaint.pdf",
    file_type: "application/pdf",
    file_size: 2500000,
    case_id: "c1",
    uploaded_by_user_id: "u1",
  });

  expect(result.id).toBe("d1");
  expect(prisma.document.create).toHaveBeenCalledWith({
    data: {
      file_name: "complaint.pdf",
      file_path: "uploads/complaint.pdf",
      file_type: "application/pdf",
      file_size: 2500000,
      case_id: "c1",
      uploaded_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("creates a document linked to a consultation", async () => {
  vi.mocked(prisma.document.create).mockResolvedValue({
    id: "d2",
    file_name: "intake.pdf",
    file_path: "uploads/intake.pdf",
    file_type: "application/pdf",
    file_size: 500000,
    case_id: null,
    consultation_id: "con1",
    task_id: null,
    subtask_id: null,
    uploaded_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  });

  await createDocument({
    file_name: "intake.pdf",
    file_path: "uploads/intake.pdf",
    file_type: "application/pdf",
    file_size: 500000,
    consultation_id: "con1",
    uploaded_by_user_id: "u1",
  });

  expect(prisma.document.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      consultation_id: "con1",
    }),
    select: { id: true },
  });
});

it("deletes a document", async () => {
  vi.mocked(prisma.document.delete).mockResolvedValue({
    id: "d1",
    file_name: "complaint.pdf",
    file_path: "uploads/complaint.pdf",
    file_type: "application/pdf",
    file_size: 2500000,
    case_id: null,
    consultation_id: null,
    task_id: null,
    subtask_id: null,
    uploaded_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  });

  const result = await deleteDocument("d1");

  expect(result.id).toBe("d1");
  expect(prisma.document.delete).toHaveBeenCalledWith({
    where: { id: "d1" },
    select: { id: true },
  });
});

it("propagates error when deleting nonexistent document", async () => {
  const error = new Error("Record not found");
  vi.mocked(prisma.document.delete).mockRejectedValue(error);

  await expect(deleteDocument("999")).rejects.toThrow(error);
});

it("creates a document linked to a subtask", async () => {
  vi.mocked(prisma.document.create).mockResolvedValue({
    id: "d1",
    file_name: "annex.pdf",
    file_path: "subtasks/st1/annex.pdf",
    file_type: "application/pdf",
    file_size: 1200,
    case_id: null,
    consultation_id: null,
    task_id: null,
    subtask_id: "st1",
    uploaded_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  });

  const result = await createDocumentForSubtask({
    subtaskId: "st1",
    file_name: "annex.pdf",
    file_path: "subtasks/st1/annex.pdf",
    file_type: "application/pdf",
    file_size: 1200,
    uploaded_by_user_id: "u1",
  });

  expect(result.id).toBe("d1");
  expect(prisma.document.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ subtask_id: "st1" }),
    select: { id: true },
  });
});

it("deletes a subtask document only when it belongs to that subtask", async () => {
  vi.mocked(prisma.document.findUnique).mockResolvedValue({ subtask_id: "st1" } as never);
  vi.mocked(prisma.document.delete).mockResolvedValue({ id: "d1" } as never);

  await expect(deleteDocumentForSubtask("st1", "d1")).resolves.toEqual({ id: "d1" });

  vi.mocked(prisma.document.findUnique).mockResolvedValue({ subtask_id: "other" } as never);
  await expect(deleteDocumentForSubtask("st1", "d1")).rejects.toThrow(
    "Document does not belong to the specified subtask",
  );
});

it("preserves an object whose Document row is confirmed during the GC race", async () => {
  vi.mocked(prisma.document.findMany).mockResolvedValue([]);
  vi.mocked(listObjects).mockImplementation(() =>
    (async function* () {
      yield { key: "tasks/t1/a.pdf", lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000) };
    })(),
  );
  vi.mocked(prisma.document.findFirst).mockResolvedValue({
    id: "d1",
    file_name: "a.pdf",
    file_path: "tasks/t1/a.pdf",
    file_type: "application/pdf",
    file_size: 10,
    case_id: null,
    consultation_id: null,
    task_id: "t1",
    subtask_id: null,
    uploaded_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  });

  await expect(runStorageGc()).resolves.toBe(0);

  expect(prisma.document.findFirst).toHaveBeenCalledWith({
    where: { file_path: "tasks/t1/a.pdf" },
    select: { id: true },
  });
  expect(deleteFile).not.toHaveBeenCalled();
});
