"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { getParentPath } from "@/lib/path";

import { createNote, deleteNote, updateNote } from "./mutations";
import { getNoteById, getNoteRowById, type NoteRow } from "./queries";
import { NoteCreatePayloadSchema, NoteIdSchema, NoteUpdatePayloadSchema } from "./schemas";

export async function getNoteRowByIdAction(noteId: string): Promise<NoteRow | null> {
  await requireAuth();

  const parsed = NoteIdSchema.safeParse({ noteId });
  if (!parsed.success) {
    throw new Error("Invalid note ID");
  }

  return getNoteRowById(parsed.data.noteId);
}

export async function createNoteAction(
  payload: z.input<typeof NoteCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = NoteCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid note data" };
  }

  const { content, case_id, consultation_id } = parsed.data;

  let note;
  try {
    note = await createNote({
      content,
      case_id,
      consultation_id,
      created_by_user_id: session.id,
    });
  } catch {
    return { success: false, error: "Failed to create note" };
  }

  revalidatePath(case_id ? `/case/${case_id}` : `/consultation/${consultation_id}`);

  return { success: true, data: { id: note.id } };
}

export async function updateNoteAction(
  payload: z.input<typeof NoteUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = NoteUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid note data" };
  }

  const { noteId, content } = parsed.data;

  try {
    const existing = await getNoteById(noteId);
    if (!existing) return { success: false, error: "Note not found" };

    await updateNote(noteId, content);

    revalidatePath(getParentPath(existing));

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update note" };
  }
}

export async function deleteNoteAction(
  payload: z.input<typeof NoteIdSchema>,
): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = NoteIdSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid note ID" };
  }

  const { noteId } = parsed.data;

  try {
    const existing = await getNoteById(noteId);
    if (!existing) return { success: false, error: "Note not found" };

    await deleteNote(noteId);

    revalidatePath(getParentPath(existing));

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete note" };
  }
}
