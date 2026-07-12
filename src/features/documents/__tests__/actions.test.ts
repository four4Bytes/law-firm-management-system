import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/s3";

import { deleteDocumentAction } from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/s3", () => ({
  deleteFile: vi.fn(),
  generateKey: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
  objectExists: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const documentRecord: Prisma.DocumentGetPayload<{
  select: {
    id: true;
    file_path: true;
    file_name: true;
    case_id: true;
    consultation_id: true;
    created_at: true;
    updated_at: true;
    file_type: true;
    file_size: true;
    uploaded_by_user_id: true;
    task_id: true;
  };
}> = {
  id: uuid,
  file_path: "uploads/complaint.pdf",
  file_name: "complaint.pdf",
  case_id: "c1",
  consultation_id: null,
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  file_type: "application/pdf",
  file_size: 1024,
  uploaded_by_user_id: "u1",
  task_id: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteDocumentAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteDocumentAction("")).toEqual({
      success: false,
      error: "Invalid document ID",
    });
  });

  it("returns an error for a non-uuid documentId", async () => {
    expect(await deleteDocumentAction("abc")).toEqual({
      success: false,
      error: "Invalid document ID",
    });
  });

  it("returns an error when the document is not found", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

    expect(await deleteDocumentAction(uuid)).toEqual({
      success: false,
      error: "Document not found",
    });
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it("deletes the file and record, then revalidates the case path", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(documentRecord);

    const result = await deleteDocumentAction(uuid);

    expect(result).toEqual({ success: true });
    expect(deleteFile).toHaveBeenCalledWith("uploads/complaint.pdf");
    expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: uuid } });
    expect(revalidatePath).toHaveBeenCalledWith("/case/c1");
  });

  it("revalidates the consultation path when the document belongs to a consultation", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue({
      ...documentRecord,
      case_id: null,
      consultation_id: "con1",
    });

    expect(await deleteDocumentAction(uuid)).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/consultation/con1");
  });

  it("returns an error when deleting the file from storage fails", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(documentRecord);
    vi.mocked(deleteFile).mockRejectedValue(new Error("s3 error"));

    expect(await deleteDocumentAction(uuid)).toEqual({
      success: false,
      error: "Failed to delete document",
    });
    expect(prisma.document.delete).not.toHaveBeenCalled();
  });

  it("returns an error when deleting the database record fails", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(documentRecord);
    vi.mocked(deleteFile).mockResolvedValue(undefined);
    vi.mocked(prisma.document.delete).mockRejectedValue(new Error("db error"));

    expect(await deleteDocumentAction(uuid)).toEqual({
      success: false,
      error: "Failed to delete document",
    });
  });
});