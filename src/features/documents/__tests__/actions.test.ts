import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { FORBIDDEN_MESSAGE } from "@/lib/rbac";
import { deleteFile } from "@/lib/s3";

import {
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
  getDocumentsPaginatedAction,
} from "../actions";
import { deleteDocument } from "../mutations";
import { getDocumentAccessContext, getDocumentById } from "../queries";

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
  task_id: null,
  task: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: false, own: false });
  vi.mocked(getDocumentById).mockResolvedValue(documentRecord);
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

describe("deleteDocumentAction", () => {
  it("returns FORBIDDEN_MESSAGE when attachment delete is denied", async () => {
    expect(await deleteDocumentAction({ documentId: uuid })).toEqual({
      success: false,
      error: FORBIDDEN_MESSAGE,
    });
  });

  it("returns success when authorized", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Lawyer,
      name: "n2",
    });
    vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await deleteDocumentAction({ documentId: uuid });

    expect(result).toEqual({ success: true });
    expect(deleteDocument).toHaveBeenCalledWith(uuid);
    expect(deleteFile).toHaveBeenCalledWith(documentRecord.file_path);
  });
});
