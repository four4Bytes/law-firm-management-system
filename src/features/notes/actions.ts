"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import {
  actionForbidden,
  actionInvalid,
  actionNotFound,
  type ActionDataResponse,
  type ActionStatusResponse,
} from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { ForbiddenError, toActionResponse } from "@/lib/errors";
import { getParentPath } from "@/lib/path";
import { can } from "@/lib/rbac";

import {
  createNote,
  createNoteForTask,
  deleteNote,
  deleteNoteForTask,
  updateNote,
  updateNoteForTask,
} from "./mutations";
import {
  getNoteAccessContext,
  getNoteById,
  getNoteRowById,
  getTaskNotes,
  type NoteRow,
} from "./queries";
import { NoteCreatePayloadSchema, NoteIdSchema, NoteUpdatePayloadSchema } from "./schemas";

export async function getNoteRowByIdAction(
  noteId: string,
): Promise<{ row: NoteRow | null; canUpdate: boolean }> {
  const session = await requireAuth();

  const parsed = NoteIdSchema.safeParse({ noteId });
  if (!parsed.success) {
    throw new Error("Invalid note ID");
  }

  const access = await getNoteAccessContext(session.id, parsed.data.noteId);
  if (!can(session.role, "note.read", access)) {
    throw new ForbiddenError();
  }

  const row = await getNoteRowById(parsed.data.noteId);

  return {
    row,
    canUpdate: row !== null && can(session.role, "note.update", access),
  };
}

export async function getTaskNotesAction(taskId: string): Promise<NoteRow[]> {
  const session = await requireAuth();

  const parsed = z.uuid().safeParse(taskId);
  if (!parsed.success) return [];

  const access = await getTaskAccessContext(session.id, parsed.data);
  if (!can(session.role, "task.read", access)) return [];

  return getTaskNotes(parsed.data);
}

export async function createNoteAction(
  payload: z.input<typeof NoteCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = NoteCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("note");

  const { content, case_id, consultation_id, task_id } = parsed.data;

  let note: { id: string };
  try {
    if (task_id) {
      const taskAccess = await getTaskAccessContext(session.id, task_id);
      if (
        !can(session.role, "task.update", taskAccess) ||
        !can(session.role, "note.create", taskAccess)
      ) {
        return actionForbidden();
      }
    } else if (case_id) {
      const caseAccess = await getCaseAccessContext(session.id, case_id);
      if (!can(session.role, "note.create", caseAccess)) {
        return actionForbidden();
      }
    } else {
      const consultationAccess = await getConsultationAccessContext(session.id, consultation_id!);
      if (!can(session.role, "note.create", consultationAccess)) {
        return actionForbidden();
      }
    }

    if (task_id) {
      note = await createNoteForTask(task_id, {
        content,
        case_id,
        consultation_id,
        created_by_user_id: session.id,
      });
    } else {
      note = await createNote({
        content,
        case_id,
        consultation_id,
        task_id,
        created_by_user_id: session.id,
      });
    }

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "note.created",
        entityType: task_id ? "Task" : case_id ? "Case" : "Consultation",
        entityId: (task_id ?? case_id ?? consultation_id)!,
        details: `Created note with ID: ${note.id}`,
      }),
    );
  } catch (error) {
    return toActionResponse(error, "create note");
  }

  let parentPath = "/case";
  if (task_id) {
    const task = await getTaskById(task_id);
    if (task) parentPath = `/case/${task.case_id}`;
  } else if (case_id) {
    parentPath = `/case/${case_id}`;
  } else {
    parentPath = `/consultation/${consultation_id}`;
  }

  revalidatePath(parentPath);

  return { success: true, data: { id: note.id } };
}

export async function updateNoteAction(
  payload: z.input<typeof NoteUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = NoteUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("note");

  const { noteId, content } = parsed.data;

  try {
    const existing = await getNoteById(noteId);
    if (!existing) return actionNotFound("Note");

    const access = await getNoteAccessContext(session.id, noteId);
    if (!can(session.role, "note.update", access)) {
      return actionForbidden();
    }

    if (existing.task_id) {
      const taskAccess = await getTaskAccessContext(session.id, existing.task_id);
      if (!can(session.role, "task.update", taskAccess)) {
        return actionForbidden();
      }
    }

    if (existing.content === content) {
      return { success: true };
    }

    if (existing.task_id) {
      await updateNoteForTask(existing.task_id, noteId, content);
    } else {
      await updateNote(noteId, content);
    }

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "note.updated",
        entityType: existing.task_id ? "Task" : existing.case_id ? "Case" : "Consultation",
        entityId: (existing.task_id ?? existing.case_id ?? existing.consultation_id)!,
        details: `Updated note with ID: ${noteId}`,
      }),
    );

    revalidatePath(existing.task_id ? `/case/${existing.task?.case_id}` : getParentPath(existing));

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update note");
  }
}

export async function deleteNoteAction(
  payload: z.input<typeof NoteIdSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = NoteIdSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("note");

  const { noteId } = parsed.data;

  try {
    const existing = await getNoteById(noteId);
    if (!existing) return actionNotFound("Note");

    const access = await getNoteAccessContext(session.id, noteId);
    if (!can(session.role, "note.delete", access)) {
      return actionForbidden();
    }

    if (existing.task_id) {
      const taskAccess = await getTaskAccessContext(session.id, existing.task_id);
      if (!can(session.role, "task.update", taskAccess)) {
        return actionForbidden();
      }
    }

    if (existing.task_id) {
      await deleteNoteForTask(existing.task_id, noteId);
    } else {
      await deleteNote(noteId);
    }

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "note.deleted",
        entityType: existing.task_id ? "Task" : existing.case_id ? "Case" : "Consultation",
        entityId: (existing.task_id ?? existing.case_id ?? existing.consultation_id)!,
        details: `Deleted note with ID: ${noteId}`,
      }),
    );

    revalidatePath(existing.task_id ? `/case/${existing.task?.case_id}` : getParentPath(existing));

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "delete note");
  }
}
