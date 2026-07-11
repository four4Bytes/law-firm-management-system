import { beforeEach, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createNote, deleteNote, updateNote } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: { note: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it("creates a note linked to a case", async () => {
  vi.mocked(prisma.note.create).mockResolvedValue({
    id: "n1",
    content: "Note content",
    case_id: "c1",
    consultation_id: null,
    task_id: null,
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  });

  const result = await createNote({
    content: "Note content",
    case_id: "c1",
    created_by_user_id: "u1",
  });

  expect(result.id).toBe("n1");
  expect(prisma.note.create).toHaveBeenCalledWith({
    data: {
      content: "Note content",
      case_id: "c1",
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("creates a note linked to a consultation", async () => {
  vi.mocked(prisma.note.create).mockResolvedValue({
    id: "n2",
    content: "Consultation note",
    case_id: null,
    consultation_id: "con1",
    task_id: null,
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  });

  await createNote({
    content: "Consultation note",
    consultation_id: "con1",
    created_by_user_id: "u1",
  });

  expect(prisma.note.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      consultation_id: "con1",
    }),
    select: { id: true },
  });
});

it("updates a note", async () => {
  vi.mocked(prisma.note.update).mockResolvedValue({
    id: "n1",
    content: "Updated content",
    case_id: null,
    consultation_id: null,
    task_id: null,
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  });

  const result = await updateNote("n1", "Updated content");

  expect(result.id).toBe("n1");
  expect(prisma.note.update).toHaveBeenCalledWith({
    where: { id: "n1" },
    data: { content: "Updated content" },
    select: { id: true },
  });
});

it("deletes a note", async () => {
  vi.mocked(prisma.note.delete).mockResolvedValue({
    id: "n1",
    content: "Note content",
    case_id: null,
    consultation_id: null,
    task_id: null,
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  });

  const result = await deleteNote("n1");

  expect(result.id).toBe("n1");
  expect(prisma.note.delete).toHaveBeenCalledWith({ where: { id: "n1" }, select: { id: true } });
});

it("propagates error when deleting nonexistent note", async () => {
  const error = new Error("Record not found");
  vi.mocked(prisma.note.delete).mockRejectedValue(error);

  await expect(deleteNote("999")).rejects.toThrow(error);
});
