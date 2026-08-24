import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { TASK_LOCKED_MESSAGE } from "@/lib/errors";
import { FORBIDDEN_MESSAGE } from "@/lib/rbac";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import {
  confirmDocumentUploadAction,
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
  getDocumentsPaginatedAction,
  getDocumentUploadUrlAction,
} from "../actions";
import { createDocument, deleteDocument } from "../mutations";
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

vi.mock("@/features/tasks/queries", () => ({
  getTaskAccessContext: vi.fn(),
  getTaskById: vi.fn(),
}));

vi.mock("@/features/audit/mutations", () => ({
  logAudit: vi.fn(),
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
  generateKey: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
  objectExists: vi.fn(),
}));

vi.mock("@/lib/storage-cleanup", () => ({
  deleteDocumentFiles: vi.fn(),
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
    expect(deleteDocumentFiles).toHaveBeenCalledWith([documentRecord.file_path]);
  });
});

describe("task subdata lock", () => {
  const cancelledTask = {
    id: uuid,
    status: "Cancelled" as const,
    case_id: uuid,
  } as unknown as Awaited<ReturnType<typeof getTaskById>>;

  beforeEach(() => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({ assigned: true, own: false });
  });

  it("refuses to issue an upload URL for a cancelled task", async () => {
    vi.mocked(getTaskById).mockResolvedValue(cancelledTask);

    await expect(
      getDocumentUploadUrlAction({
        file_name: "a.pdf",
        file_type: "application/pdf",
        case_id: null,
        consultation_id: null,
        task_id: uuid,
      }),
    ).rejects.toThrow(TASK_LOCKED_MESSAGE);
  });

  it("refuses to confirm a document upload on a cancelled task", async () => {
    vi.mocked(getTaskById).mockResolvedValue(cancelledTask);

    const result = await confirmDocumentUploadAction({
      file_name: "a.pdf",
      file_type: "application/pdf",
      file_size: 10,
      file_path: "tasks/t1/a.pdf",
      case_id: null,
      consultation_id: null,
      task_id: uuid,
    });

    expect(result).toEqual({ success: false, error: TASK_LOCKED_MESSAGE });
    expect(createDocument).not.toHaveBeenCalled();
  });

  it("refuses to delete a document on a cancelled task", async () => {
    vi.mocked(getDocumentById).mockResolvedValue({
      ...documentRecord,
      task_id: uuid,
      task: cancelledTask,
    });

    const result = await deleteDocumentAction({ documentId: uuid });

    expect(result).toEqual({ success: false, error: TASK_LOCKED_MESSAGE });
    expect(deleteDocument).not.toHaveBeenCalled();
  });
});
