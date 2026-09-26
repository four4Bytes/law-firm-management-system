import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCaseAccessContext } from "@/features/cases/queries";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { Role, TaskStatus } from "@/generated/prisma/browser";
import { deleteDocumentFiles } from "@/lib/files/storage-cleanup";
import { DEFAULT_MAX_UPLOAD_BYTES } from "@/lib/files/upload-policy";
import { getObjectSize } from "@/lib/infra/s3";
import { actionInvalid } from "@/lib/security/action-response";
import { ForbiddenError } from "@/lib/security/errors";
import { FORBIDDEN_MESSAGE } from "@/lib/security/rbac";
import { mockSessionUser, mockTask } from "@/test-utils/fixtures";
import { setupAuth } from "@/test-utils/test-setup";

import {
  confirmDocumentUploadAction,
  deleteDocumentAction,
  getDocumentDownloadUrlAction,
  getDocumentsPaginatedAction,
  getDocumentUploadUrlAction,
} from "../actions";
import {
  createDocument,
  createDocumentForTask,
  deleteDocument,
  deleteDocumentForTask,
} from "../mutations";
import { getAuthorizedDocument, getDocumentAccessContext, getDocumentById } from "../queries";

vi.mock("@/lib/security/auth-guards", () => ({
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

vi.mock("@/lib/domain/path", () => ({
  getParentPath: vi.fn(),
}));

vi.mock("@/lib/infra/s3", () => ({
  generateKey: vi.fn(),
  getObjectSize: vi.fn(),
  getPresignedFileUrl: vi.fn(),
  getPresignedUploadUrl: vi.fn(),
  objectExists: vi.fn(),
}));

vi.mock("@/lib/files/storage-cleanup", () => ({
  deleteDocumentFiles: vi.fn(),
}));

vi.mock("../queries", () => ({
  getDocumentAccessContext: vi.fn(),
  getDocumentById: vi.fn(),
  getAuthorizedDocument: vi.fn(),
  getDocumentsPaginated: vi.fn().mockResolvedValue({ rows: [], nextCursor: null }),
}));

vi.mock("../mutations", () => ({
  createDocument: vi.fn(),
  deleteDocument: vi.fn(),
  createDocumentForTask: vi.fn(),
  deleteDocumentForTask: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const sessionLawyer = mockSessionUser({ id: "u2", email: "e2", role: Role.Lawyer, name: "n2" });
const sessionParalegal = mockSessionUser({
  id: "u2",
  email: "e2",
  role: Role.Paralegal,
  name: "n2",
});

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
  vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: false, own: false });
  vi.mocked(getObjectSize).mockResolvedValue(10);
  vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: false, own: false });
  vi.mocked(getDocumentById).mockResolvedValue(documentRecord);
});

describe("confirmDocumentUploadAction", () => {
  const payload = {
    file_name: "a.pdf",
    file_type: "application/pdf",
    file_size: 10,
    file_path: "cases/c1/a.pdf",
    case_id: uuid,
  };

  beforeEach(() => {
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: false });
  });

  it("persists the object size reported by storage", async () => {
    vi.mocked(getObjectSize).mockResolvedValue(20);
    vi.mocked(createDocument).mockResolvedValue({ id: uuid });

    expect(await confirmDocumentUploadAction(payload)).toEqual({
      success: true,
      data: { id: uuid },
    });
    expect(getObjectSize).toHaveBeenCalledWith(payload.file_path);
    expect(createDocument).toHaveBeenCalledWith(expect.objectContaining({ file_size: 20 }));
  });

  it.each([null, -1, 0, DEFAULT_MAX_UPLOAD_BYTES + 1])(
    "rejects an invalid stored size of %s before creating a row",
    async (storedSize) => {
      vi.mocked(getObjectSize).mockResolvedValue(storedSize);

      expect(await confirmDocumentUploadAction(payload)).toEqual(
        actionInvalid("upload confirmation"),
      );
      expect(createDocument).not.toHaveBeenCalled();
    },
  );
});

afterEach(() => {
  setupAuth(sessionLawyer);
});

describe("getDocumentsPaginatedAction", () => {
  it("throws Forbidden when attachment read is denied on the parent case", async () => {
    await expect(getDocumentsPaginatedAction({ caseId: uuid, pageSize: 10 })).rejects.toThrow(
      "Forbidden",
    );
  });
});

describe("getDocumentDownloadUrlAction", () => {
  it("propagates a denied read from the authorized-document query", async () => {
    vi.mocked(getAuthorizedDocument).mockRejectedValue(new ForbiddenError());

    await expect(getDocumentDownloadUrlAction(uuid)).rejects.toThrow("Forbidden");
  });

  it("rejects when the document does not exist", async () => {
    vi.mocked(getAuthorizedDocument).mockResolvedValue(null);

    await expect(getDocumentDownloadUrlAction(uuid)).rejects.toThrow("Document not found");
  });
});

describe("deleteDocumentAction", () => {
  it("returns FORBIDDEN_MESSAGE when attachment delete is denied", async () => {
    expect(await deleteDocumentAction({ documentId: uuid })).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: FORBIDDEN_MESSAGE,
      },
    });
  });

  it("returns success when authorized", async () => {
    setupAuth(sessionLawyer);
    vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await deleteDocumentAction({ documentId: uuid });

    expect(result).toEqual({ success: true });
    expect(deleteDocument).toHaveBeenCalledWith(uuid);
    expect(deleteDocumentFiles).toHaveBeenCalledWith([documentRecord.file_path]);
  });
});

describe("documents on terminal records", () => {
  beforeEach(() => {
    setupAuth(sessionLawyer);
    vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(deleteDocument).mockResolvedValue({ id: uuid });
  });

  it("deletes a file on a cancelled consultation", async () => {
    vi.mocked(getDocumentById).mockResolvedValue({
      ...documentRecord,
      case_id: null,
      consultation_id: uuid,
    });

    expect(await deleteDocumentAction({ documentId: uuid })).toEqual({ success: true });
    expect(deleteDocumentFiles).toHaveBeenCalledWith([documentRecord.file_path]);
  });

  it("deletes a file on a settled case", async () => {
    expect(await deleteDocumentAction({ documentId: uuid })).toEqual({ success: true });
  });

  it("deletes a task file whose parent case is closed", async () => {
    vi.mocked(getDocumentById).mockResolvedValue({
      ...documentRecord,
      task_id: uuid,
      task: { case_id: uuid, status: TaskStatus.Done },
    });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(deleteDocumentForTask).mockResolvedValue({ id: uuid });

    expect(await deleteDocumentAction({ documentId: uuid })).toEqual({ success: true });
  });
});

describe("documents on a done task", () => {
  const doneTask = {
    ...mockTask({ id: uuid, case_id: uuid, status: TaskStatus.Done }),
    taskAssignments: [],
    taskReviewers: [],
  };

  beforeEach(() => {
    setupAuth(sessionLawyer);
    vi.mocked(getTaskById).mockResolvedValue(doneTask);
    vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: true, own: true });
  });

  it("issues an upload URL for a done task", async () => {
    const result = await getDocumentUploadUrlAction({
      file_name: "a.pdf",
      file_type: "application/pdf",
      case_id: null,
      consultation_id: null,
      task_id: uuid,
    });

    expect(result).toHaveProperty("uploadUrl");
  });

  it("confirms a document upload on a done task", async () => {
    vi.mocked(createDocumentForTask).mockResolvedValue({ id: "d1" });

    const result = await confirmDocumentUploadAction({
      file_name: "a.pdf",
      file_type: "application/pdf",
      file_size: 10,
      file_path: "tasks/t1/a.pdf",
      case_id: null,
      consultation_id: null,
      task_id: uuid,
    });

    expect(result).toEqual({ success: true, data: { id: "d1" } });
  });

  it("deletes a document on a done task", async () => {
    vi.mocked(getDocumentById).mockResolvedValue({
      ...documentRecord,
      task_id: uuid,
      task: doneTask,
    });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(deleteDocumentForTask).mockResolvedValue({ id: uuid });

    expect(await deleteDocumentAction({ documentId: uuid })).toEqual({ success: true });
    expect(deleteDocumentForTask).toHaveBeenCalledWith(uuid, uuid);
  });
});

describe("task-scoped document authorization (TASK_ONLY enforcement)", () => {
  const uploadArgs = {
    file_name: "a.pdf",
    file_type: "application/pdf",
    case_id: null,
    consultation_id: null,
    task_id: uuid,
  };

  const taskDocRecord = {
    ...documentRecord,
    case_id: null,
    task_id: uuid,
    task: { case_id: uuid, status: "Pending" as const },
  };

  it("denies a non-task-attached Paralegal case member an upload URL", async () => {
    setupAuth(sessionParalegal);
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: false,
    });

    await expect(getDocumentUploadUrlAction(uploadArgs)).rejects.toThrow("Forbidden");
  });

  it("allows a task-attached Paralegal an upload URL", async () => {
    setupAuth(sessionParalegal);
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(getTaskById).mockResolvedValue({
      id: uuid,
      status: "Pending" as const,
      case_id: uuid,
    } as Awaited<ReturnType<typeof getTaskById>>);

    const result = await getDocumentUploadUrlAction(uploadArgs);

    expect(result).toHaveProperty("uploadUrl");
  });

  it("denies a non-task-attached Paralegal from confirming an upload", async () => {
    setupAuth(sessionParalegal);
    vi.mocked(getTaskById).mockResolvedValue({
      id: uuid,
      status: "Pending" as const,
      case_id: uuid,
    } as Awaited<ReturnType<typeof getTaskById>>);
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: false,
    });

    const result = await confirmDocumentUploadAction({
      ...uploadArgs,
      file_size: 10,
      file_path: "tasks/t1/a.pdf",
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: FORBIDDEN_MESSAGE,
      },
    });
    expect(createDocumentForTask).not.toHaveBeenCalled();
  });

  it("denies a non-task-attached Paralegal uploader from deleting a task document", async () => {
    setupAuth(sessionParalegal);
    vi.mocked(getDocumentById).mockResolvedValue(taskDocRecord);
    vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: false,
    });

    const result = await deleteDocumentAction({ documentId: uuid });

    expect(result).toEqual({
      success: false,
      error: {
        code: "forbidden",
        title: "Access denied",
        description: FORBIDDEN_MESSAGE,
      },
    });
    expect(deleteDocumentForTask).not.toHaveBeenCalled();
  });

  it("allows a task-attached Paralegal uploader to delete a task document", async () => {
    setupAuth(sessionParalegal);
    vi.mocked(getDocumentById).mockResolvedValue(taskDocRecord);
    vi.mocked(getDocumentAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(deleteDocumentForTask).mockResolvedValue({ id: "d1" });

    const result = await deleteDocumentAction({ documentId: uuid });

    expect(result).toEqual({ success: true });
    expect(deleteDocumentForTask).toHaveBeenCalledWith(uuid, uuid);
  });
});
