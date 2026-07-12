import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import { deleteNoteAction } from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    note: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const noteRecord: Prisma.NoteGetPayload<{
  select: {
    id: true;
    content: true;
    case_id: true;
    consultation_id: true;
    created_at: true;
    updated_at: true;
    created_by_user_id: true;
    task_id: true;
  };
}> = {
  id: uuid,
  content: "Discussed settlement terms",
  case_id: "c1",
  consultation_id: null,
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  created_by_user_id: "u1",
  task_id: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteNoteAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteNoteAction("")).toEqual({
      success: false,
      error: "Invalid note ID",
    });
  });

  it("returns an error for a non-uuid noteId", async () => {
    expect(await deleteNoteAction("abc")).toEqual({
      success: false,
      error: "Invalid note ID",
    });
  });

  it("returns an error when the note is not found", async () => {
    vi.mocked(prisma.note.findUnique).mockResolvedValue(null);

    expect(await deleteNoteAction(uuid)).toEqual({
      success: false,
      error: "Note not found",
    });
  });

  it("deletes the note and revalidates the case path", async () => {
    vi.mocked(prisma.note.findUnique).mockResolvedValue(noteRecord);

    const result = await deleteNoteAction(uuid);

    expect(result).toEqual({ success: true });
    expect(prisma.note.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: uuid } }));
    expect(revalidatePath).toHaveBeenCalledWith("/case/c1");
  });

  it("revalidates the consultation path when the note belongs to a consultation", async () => {
    vi.mocked(prisma.note.findUnique).mockResolvedValue({
      ...noteRecord,
      case_id: null,
      consultation_id: "con1",
    });

    expect(await deleteNoteAction(uuid)).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/consultation/con1");
  });

  it("returns an error when deletion fails", async () => {
    vi.mocked(prisma.note.findUnique).mockResolvedValue(noteRecord);
    vi.mocked(prisma.note.delete).mockRejectedValue(new Error("db error"));

    expect(await deleteNoteAction(uuid)).toEqual({
      success: false,
      error: "Failed to delete note",
    });
  });
});