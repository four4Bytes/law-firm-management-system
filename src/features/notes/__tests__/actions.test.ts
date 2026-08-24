import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCaseAccessContext } from "@/features/cases/queries";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { TASK_LOCKED_MESSAGE, TaskLockedError } from "@/lib/errors";
import { FORBIDDEN_MESSAGE } from "@/lib/rbac";

import {
  createNoteAction,
  deleteNoteAction,
  getNoteRowByIdAction,
  updateNoteAction,
} from "../actions";
import {
  createNote,
  createNoteForTask,
  deleteNote,
  deleteNoteForTask,
  updateNote,
  updateNoteForTask,
} from "../mutations";
import { getNoteAccessContext, getNoteById, getNoteRowById } from "../queries";

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

vi.mock("../queries", () => ({
  getNoteAccessContext: vi.fn(),
  getNoteById: vi.fn(),
  getNoteRowById: vi.fn(),
}));

vi.mock("../mutations", () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  createNoteForTask: vi.fn(),
  updateNoteForTask: vi.fn(),
  deleteNoteForTask: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const noteRecord = {
  id: "n1",
  content: "Initial note",
  case_id: uuid,
  consultation_id: null,
  task_id: null,
  task: null,
  createdBy: { name: "Alice" },
};

const noteRow = {
  id: "n1",
  content: "Initial note",
  author: "Alice",
  created_at: new Date("2024-06-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getNoteAccessContext).mockResolvedValue({ assigned: false, own: false });
  vi.mocked(getNoteById).mockResolvedValue(noteRecord);
  vi.mocked(getNoteRowById).mockResolvedValue(noteRow);
});

afterEach(() => {
  vi.mocked(requireAuth).mockResolvedValue({
    id: "u2",
    email: "e2",
    role: Role.Lawyer,
    name: "n2",
  });
});

describe("getNoteRowByIdAction", () => {
  it("throws Forbidden when note read is denied", async () => {
    await expect(getNoteRowByIdAction(uuid)).rejects.toThrow("Forbidden");
  });

  it("returns canUpdate=false for a Paralegal on another user's note", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getNoteAccessContext).mockResolvedValue({ assigned: true, own: false });

    const result = await getNoteRowByIdAction(uuid);

    expect(result).toEqual({ row: noteRow, canUpdate: false });
  });

  it("returns canUpdate=true for the note owner who is assigned", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getNoteAccessContext).mockResolvedValue({ assigned: true, own: true });

    const result = await getNoteRowByIdAction(uuid);

    expect(result).toEqual({ row: noteRow, canUpdate: true });
  });
});

describe("createNoteAction", () => {
  it("returns FORBIDDEN_MESSAGE when note create is denied on the parent case", async () => {
    expect(await createNoteAction({ content: "New note", case_id: uuid })).toEqual({
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
    vi.mocked(getCaseAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(createNote).mockResolvedValue(noteRecord);

    const result = await createNoteAction({ content: "New note", case_id: uuid });

    expect(result).toEqual({ success: true, data: { id: "n1" } });
  });
});

describe("updateNoteAction", () => {
  it("returns FORBIDDEN_MESSAGE when note update is denied", async () => {
    expect(await updateNoteAction({ noteId: uuid, content: "Updated note" })).toEqual({
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
    vi.mocked(getNoteAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(updateNote).mockResolvedValue(noteRecord);

    const result = await updateNoteAction({ noteId: uuid, content: "Updated note" });

    expect(result).toEqual({ success: true });
  });
});

describe("deleteNoteAction", () => {
  it("returns FORBIDDEN_MESSAGE when note delete is denied", async () => {
    expect(await deleteNoteAction({ noteId: uuid })).toEqual({
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
    vi.mocked(getNoteAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(deleteNote).mockResolvedValue(noteRecord);

    const result = await deleteNoteAction({ noteId: uuid });

    expect(result).toEqual({ success: true });
  });
});

describe("task subdata lock", () => {
  const cancelledTask = {
    id: uuid,
    status: "Cancelled" as const,
    case_id: uuid,
  } as unknown as Awaited<ReturnType<typeof getTaskById>>;

  beforeEach(() => {
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(getNoteAccessContext).mockResolvedValue({
      assigned: true,
      own: true,
    });
  });

  it("refuses to create a note on a cancelled task", async () => {
    vi.mocked(getTaskById).mockResolvedValue(cancelledTask);
    vi.mocked(createNoteForTask).mockRejectedValue(new TaskLockedError());

    const result = await createNoteAction({
      content: "New note",
      case_id: null,
      consultation_id: null,
      task_id: uuid,
    });

    expect(result).toEqual({ success: false, error: TASK_LOCKED_MESSAGE });
    expect(createNoteForTask).toHaveBeenCalledWith(uuid, expect.any(Object));
  });

  it("refuses to update a note on a cancelled task", async () => {
    vi.mocked(getTaskById).mockResolvedValue(cancelledTask);
    vi.mocked(getNoteById).mockResolvedValue({ ...noteRecord, task_id: uuid });
    vi.mocked(updateNoteForTask).mockRejectedValue(new TaskLockedError());

    const result = await updateNoteAction({ noteId: uuid, content: "Updated note" });

    expect(result).toEqual({ success: false, error: TASK_LOCKED_MESSAGE });
    expect(updateNoteForTask).toHaveBeenCalledWith(uuid, uuid, "Updated note");
  });

  it("refuses to delete a note on a cancelled task", async () => {
    vi.mocked(getTaskById).mockResolvedValue(cancelledTask);
    vi.mocked(getNoteById).mockResolvedValue({ ...noteRecord, task_id: uuid });
    vi.mocked(deleteNoteForTask).mockRejectedValue(new TaskLockedError());

    const result = await deleteNoteAction({ noteId: uuid });

    expect(result).toEqual({ success: false, error: TASK_LOCKED_MESSAGE });
    expect(deleteNoteForTask).toHaveBeenCalledWith(uuid, uuid);
  });
});

describe("task-scoped note authorization (TASK_ONLY enforcement)", () => {
  const taskPayload = {
    content: "New note",
    case_id: null,
    consultation_id: null,
    task_id: uuid,
  };

  it("denies a non-task-attached Paralegal case member from creating a task note", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
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

    const result = await createNoteAction(taskPayload);

    expect(result).toEqual({ success: false, error: FORBIDDEN_MESSAGE });
    expect(createNoteForTask).not.toHaveBeenCalled();
  });

  it("allows a task-attached Paralegal to create a task note", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getTaskById).mockResolvedValue({
      id: uuid,
      status: "Pending" as const,
      case_id: uuid,
    } as Awaited<ReturnType<typeof getTaskById>>);
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(createNoteForTask).mockResolvedValue({ id: "n1" });

    const result = await createNoteAction(taskPayload);

    expect(result).toEqual({ success: true, data: { id: "n1" } });
    expect(createNoteForTask).toHaveBeenCalledWith(uuid, expect.any(Object));
  });

  it("denies a non-task-attached Paralegal from updating a task note", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getTaskById).mockResolvedValue({
      id: uuid,
      status: "Pending" as const,
      case_id: uuid,
    } as Awaited<ReturnType<typeof getTaskById>>);
    vi.mocked(getNoteById).mockResolvedValue({ ...noteRecord, task_id: uuid });
    vi.mocked(getNoteAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: false,
    });

    const result = await updateNoteAction({ noteId: uuid, content: "Updated note" });

    expect(result).toEqual({ success: false, error: FORBIDDEN_MESSAGE });
    expect(updateNoteForTask).not.toHaveBeenCalled();
  });

  it("allows an attached Paralegal note owner to delete a task note", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getTaskById).mockResolvedValue({
      id: uuid,
      status: "Pending" as const,
      case_id: uuid,
    } as Awaited<ReturnType<typeof getTaskById>>);
    vi.mocked(getNoteById).mockResolvedValue({ ...noteRecord, task_id: uuid });
    vi.mocked(getNoteAccessContext).mockResolvedValue({ assigned: true, own: true });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });
    vi.mocked(deleteNoteForTask).mockResolvedValue({ id: "n1" });

    const result = await deleteNoteAction({ noteId: uuid });

    expect(result).toEqual({ success: true });
    expect(deleteNoteForTask).toHaveBeenCalledWith(uuid, uuid);
  });

  it("denies a task-attached Paralegal from deleting another user's task note", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: "u2",
      email: "e2",
      role: Role.Paralegal,
      name: "n2",
    });
    vi.mocked(getTaskById).mockResolvedValue({
      id: uuid,
      status: "Pending" as const,
      case_id: uuid,
    } as Awaited<ReturnType<typeof getTaskById>>);
    vi.mocked(getNoteById).mockResolvedValue({ ...noteRecord, task_id: uuid });
    vi.mocked(getNoteAccessContext).mockResolvedValue({ assigned: true, own: false });
    vi.mocked(getTaskAccessContext).mockResolvedValue({
      assigned: true,
      own: false,
      taskOnly: true,
    });

    const result = await deleteNoteAction({ noteId: uuid });

    expect(result).toEqual({ success: false, error: FORBIDDEN_MESSAGE });
    expect(deleteNoteForTask).not.toHaveBeenCalled();
  });
});
