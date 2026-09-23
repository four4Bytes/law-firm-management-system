import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/infra/prisma";
import { mockNote as mockBaseNote } from "@/test-utils/fixtures";

import {
  getCaseNotesPaginated,
  getCaseNotesWithTaskNotesPaginated,
  getConsultationNotesPaginated,
  getNoteById,
  getNoteRowById,
  getTaskNotesPaginated,
  type NoteRow,
} from "../queries";

vi.mock("@/lib/infra/prisma", () => ({
  prisma: { note: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

const mockNote = (overrides: Record<string, unknown> = {}) => ({
  ...mockBaseNote(),
  content: "Note content",
  case_id: "c1",
  createdBy: { name: "John Lawyer" },
  ...overrides,
});

describe("getNoteById", () => {
  it("returns note with author and parent IDs", async () => {
    vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote());

    const result = await getNoteById("n1");

    expect(result).toMatchObject({
      id: "n1",
      content: "Note content",
      case_id: "c1",
      consultation_id: null,
      createdBy: { name: "John Lawyer" },
    });
    expect(prisma.note.findUnique).toHaveBeenCalledWith({
      where: { id: "n1" },
      select: {
        id: true,
        content: true,
        case_id: true,
        consultation_id: true,
        task_id: true,
        task: { select: { case_id: true } },
        createdBy: { select: { name: true } },
      },
    });
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

    const result = await getNoteById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.note.findUnique).mockRejectedValue(error);

    await expect(getNoteById("n1")).rejects.toThrow(error);
  });
});

describe("getNoteRowById", () => {
  it("maps to NoteRow shape", async () => {
    vi.mocked(prisma.note.findUnique).mockResolvedValue(mockNote());

    const result = await getNoteRowById("n1");

    const expected: NoteRow = {
      id: "n1",
      content: "Note content",
      author: "John Lawyer",
      created_at: new Date("2024-06-05"),
    };
    expect(result).toEqual(expected);
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

    const result = await getNoteRowById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.note.findUnique).mockRejectedValue(error);

    await expect(getNoteRowById("n1")).rejects.toThrow(error);
  });
});

describe("getTaskNotesPaginated", () => {
  const mockNote = (overrides: Record<string, unknown> = {}) => ({
    ...mockBaseNote(),
    content: "Task note content",
    task_id: "t1",
    createdBy: { name: "Bob Lawyer" },
    ...overrides,
  });

  it("returns mapped note rows", async () => {
    const notes = [mockNote(), mockNote({ id: "n2", content: "Review done" })];
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes as unknown as never[]);

    const result = await getTaskNotesPaginated({ taskId: "t1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "n1",
      content: "Task note content",
      author: "Bob Lawyer",
      created_at: notes[0].created_at,
    });
    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: "t1" },
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("handles notes with identical timestamps deterministically", async () => {
    const now = new Date("2024-06-01T12:00:00Z");
    const notes = [
      mockNote({ id: "n1", created_at: now }),
      mockNote({ id: "n2", created_at: now }),
    ];
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes as unknown as never[]);

    const result = await getTaskNotesPaginated({ taskId: "t1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].id).toBe("n1");
    expect(result.rows[1].id).toBe("n2");
  });

  it("handles cursor pagination", async () => {
    const notes = Array.from({ length: 4 }, (_, i) => mockNote({ id: String(i + 1) }));
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes as unknown as never[]);

    const result = await getTaskNotesPaginated({ taskId: "t1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([mockNote()] as unknown as never[]);

    await getTaskNotesPaginated({ taskId: "t1", search: "evidence" });

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { task_id: "t1", content: { contains: "evidence", mode: "insensitive" } },
      }),
    );
  });
});

describe("getCaseNotesPaginated", () => {
  const mockNote = (overrides: Record<string, unknown> = {}) => ({
    ...mockBaseNote(),
    content: "Client called about the case",
    createdBy: { name: "Bob Lawyer" },
    ...overrides,
  });

  it("returns mapped note rows", async () => {
    const notes = [
      mockNote(),
      mockNote({ id: "n2", content: "Evidence received", createdBy: { name: "Carol Paralegal" } }),
    ];
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes);

    const result = await getCaseNotesPaginated({ caseId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "n1",
      content: "Client called about the case",
      author: "Bob Lawyer",
      created_at: notes[0].created_at,
    });
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([mockNote()]);

    await getCaseNotesPaginated({ caseId: "1", search: "evidence" });

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", content: { contains: "evidence", mode: "insensitive" } },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const notes = Array.from({ length: 4 }, (_, i) => mockNote({ id: String(i + 1) }));
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes);

    const result = await getCaseNotesPaginated({ caseId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    const result = await getCaseNotesPaginated({ caseId: "1" });

    expect(result.rows).toEqual([]);
  });
});

describe("getCaseNotesWithTaskNotesPaginated", () => {
  const mockNote = (overrides: Record<string, unknown> = {}) => ({
    ...mockBaseNote(),
    content: "Client called about the case",
    createdBy: { name: "Bob Lawyer" },
    ...overrides,
  });

  it("returns mapped note rows including task notes", async () => {
    const notes = [
      mockNote({ id: "n1", content: "Case note 1", case_id: "1", task_id: null }),
      mockNote({
        id: "n2",
        content: "Task note 1",
        case_id: null,
        task_id: "t1",
        task: { id: "t1", case_id: "1" },
      }),
    ];
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes);

    const result = await getCaseNotesWithTaskNotesPaginated({ caseId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "n1",
      content: "Case note 1",
      author: "Bob Lawyer",
      created_at: notes[0].created_at,
    });
    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ case_id: "1" }, { task: { case_id: "1" } }],
        },
        orderBy: [{ created_at: "desc" }, { id: "asc" }],
      }),
    );
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([mockNote()]);

    await getCaseNotesWithTaskNotesPaginated({ caseId: "1", search: "evidence" });

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ case_id: "1" }, { task: { case_id: "1" } }],
          content: { contains: "evidence", mode: "insensitive" },
        },
      }),
    );
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    const result = await getCaseNotesWithTaskNotesPaginated({ caseId: "1" });

    expect(result.rows).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});

describe("getConsultationNotesPaginated", () => {
  const mockNote = (overrides: Record<string, unknown> = {}) => ({
    ...mockBaseNote(),
    content: "Client discussed settlement options",
    consultation_id: "1",
    createdBy: { name: "John Lawyer" },
    ...overrides,
  });

  it("returns mapped note rows", async () => {
    const notes = [
      mockNote(),
      mockNote({
        id: "n2",
        content: "Follow-up call scheduled",
        createdBy: { name: "Alice Paralegal" },
      }),
    ];
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes);

    const result = await getConsultationNotesPaginated({ consultationId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "n1",
      content: "Client discussed settlement options",
      author: "John Lawyer",
      created_at: notes[0].created_at,
    });
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([mockNote()]);

    await getConsultationNotesPaginated({ consultationId: "1", search: "settlement" });

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { consultation_id: "1", content: { contains: "settlement", mode: "insensitive" } },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const notes = Array.from({ length: 4 }, (_, i) => mockNote({ id: String(i + 1) }));
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes);

    const result = await getConsultationNotesPaginated({ consultationId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    const result = await getConsultationNotesPaginated({ consultationId: "1" });

    expect(result.rows).toEqual([]);
  });
});
