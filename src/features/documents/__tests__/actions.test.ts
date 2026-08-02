import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { FORBIDDEN_MESSAGE } from "@/lib/rbac";

import {
  deleteDocumentAction,
  getDocumentDetailRowAction,
  getDocumentDownloadUrlAction,
  getDocumentsPaginatedAction,
} from "../actions";
import { getDocumentAccessContext, getDocumentById, getDocumentDetailRowById } from "../queries";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u2", email: "e2", role: Role.Lawyer, name: "n2" }),
}));

vi.mock("@/features/cases/queries", () => ({
  getCaseAccessContext: vi.fn().mockResolvedValue({ assigned: false, own: false }),
}));

vi.mock("@/features/consultations/queries", () => ({
  getConsultationAccessContext: vi.fn().mockResolvedValue({ assigned: false, own: false }),
}));

vi.mock("@/features/audit/mutations", () => ({
  createAuditLog: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: vi.fn(),
}));

vi.mock("@/lib/path", () => ({
  getParentPath: vi.fn(),
}));

vi.mock("@/lib/s3", () => ({
  deleteFile: vi.fn(),
  generateKey: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
  objectExists: vi.fn(),
}));

vi.mock("../queries", () => ({
  getDocumentAccessContext: vi.fn(),
  getDocumentById: vi.fn(),
  getDocumentDetailRowById: vi.fn(),
  getDocumentsPaginated: vi.fn().mockResolvedValue({ rows: [], nextCursor: null }),
}));

vi.mock("../mutations", () => ({
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const documentRecord = {
  id: "d1",
  file_path: "cases/c1/file.pdf",
  file_name: "file.pdf",
  case_id: uuid,
  consultation_id: null,
  task: null,
};

const detailRow = {
  id: "d1",
  file_name: "file.pdf",
  file_type: "pdf",
  file_size: 1024,
  uploadedBy: "Alice",
  created_at: new Date("2024-06-01"),
  case_id: uuid,
  consultation_id: null,
  task_case_id: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: false, own: false });
  vi.mocked(getDocumentById).mockResolvedValue(documentRecord);
  vi.mocked(getDocumentDetailRowById).mockResolvedValue(detailRow);
});

afterEach(() => {
  vi.mocked(requireAuth).mockResolvedValue({
    id: "u2",
    email: "e2",
    role: Role.Lawyer,
    name: "n2",
  });
});

describe("getDocumentsPaginatedAction", () => {
  it("throws Forbidden when attachment read is denied on the parent case", async () => {
    await expect(getDocumentsPaginatedAction({ caseId: uuid, pageSize: 10 })).rejects.toThrow(
      "Forbidden",
    );
  });
});

describe("getDocumentDownloadUrlAction", () => {
  it("throws Forbidden when attachment read is denied", async () => {
    await expect(getDocumentDownloadUrlAction(uuid)).rejects.toThrow("Forbidden");
  });
});

describe("getDocumentDetailRowAction", () => {
  it("throws Forbidden when attachment read is denied", async () => {
    await expect(getDocumentDetailRowAction(uuid)).rejects.toThrow("Forbidden");
  });

  it("returns canDelete=false for a Paralegal who is assigned but not the uploader", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: true, own: false });

    const result = await getDocumentDetailRowAction(uuid);

    expect(result).toEqual({ row: detailRow, canDelete: false });
  });

  it("returns canDelete=true for the uploader", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await getDocumentDetailRowAction(uuid);

    expect(result).toEqual({ row: detailRow, canDelete: true });
  });
});

describe("deleteDocumentAction", () => {
  it("returns FORBIDDEN_MESSAGE when attachment delete is denied", async () => {
    expect(await deleteDocumentAction({ documentId: uuid })).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });

  it("deletes document when authorized", async () => {
    const { getDocumentAccessContext, getDocumentById } = await import("../queries");
    const { deleteDocument: deleteDocumentRecord } = await import("../mutations");
    const { deleteFile } = await import("@/lib/s3");

    vi.mocked(getDocumentById).mockResolvedValue(documentRecord);
    vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(deleteDocumentRecord).mockResolvedValue({ id: uuid });
    vi.mocked(deleteFile).mockResolvedValue({ $metadata: {} } as any);

    const result = await deleteDocumentAction({ documentId: uuid });

    expect(result).toEqual({ success: true });
    expect(deleteDocumentRecord).toHaveBeenCalledWith(uuid);
    expect(deleteFile).toHaveBeenCalledWith("cases/c1/file.pdf");
  });
});
