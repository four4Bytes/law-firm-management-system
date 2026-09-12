import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  getCaseNotesPaginated,
  getCaseNotesWithTaskNotesPaginated,
  getNoteById,
  getNoteRowById,
  getTaskNotesPaginated,
  type NoteRow,
} from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { note: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

const mockNote = (overrides: Record<string, unknown> = {}) => ({
  id: "n1",
  content: "Note content",
  case_id: "c1",
  consultation_id: null,
  task_id: null,
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
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
      created_at: new Date("2024-06-01"),
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
    id: "n1",
    content: "Task note content",
    task_id: "t1",
    created_at: new Date("2024-06-01"),
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
        orderBy: { created_at: "desc" },
      }),
    );
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
    id: "n1",
    content: "Client called about the case",
    case_id: "1",
    consultation_id: null,
    task_id: null,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
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
    id: "n1",
    content: "Client called about the case",
    case_id: "1",
    consultation_id: null,
    task_id: null,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
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
