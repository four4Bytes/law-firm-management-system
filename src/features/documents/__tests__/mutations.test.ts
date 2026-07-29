import { beforeEach, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createDocument, deleteDocument } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: { document: { create: vi.fn(), delete: vi.fn() } },
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
