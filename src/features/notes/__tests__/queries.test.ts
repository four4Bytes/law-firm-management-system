import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getNoteById, getNoteRowById, type NoteRow } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { note: { findUnique: vi.fn() } },
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
