"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import { getSubtaskDetailRowById, type SubtaskDetailRow } from "@/features/subtasks/queries";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { getParentPath } from "@/lib/domain/path";
import {
  actionForbidden,
  actionInvalid,
  actionNotFound,
  type ActionDataResponse,
  type ActionStatusResponse,
} from "@/lib/security/action-response";
import { requireAuth } from "@/lib/security/auth-guards";
import { ForbiddenError, toActionResponse } from "@/lib/security/errors";
import { can } from "@/lib/security/rbac";

import {
  createNote,
  createNoteForSubtask,
  createNoteForTask,
  deleteNote,
  deleteNoteForSubtask,
  deleteNoteForTask,
  updateNote,
  updateNoteForSubtask,
  updateNoteForTask,
} from "./mutations";
import {
  getCaseNotesPaginated,
  getCaseNotesWithTaskNotesPaginated,
  getConsultationNotesPaginated,
  getNoteAccessContext,
  getNoteById,
  getNoteRowById,
  getSubtaskNotesPaginated,
  getTaskNotesPaginated,
  type NoteRow,
} from "./queries";
import {
  CaseNotesListQuerySchema,
  ConsultationNotesListQuerySchema,
  NoteCreatePayloadSchema,
  NoteIdSchema,
  NoteUpdatePayloadSchema,
  SubtaskNotesListQuerySchema,
  TaskNotesListQuerySchema,
} from "./schemas";

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

  const existing = await getNoteById(parsed.data.noteId);
  const taskAccess = existing?.task_id
    ? await getTaskAccessContext(session.id, existing.task_id)
    : null;
  if (taskAccess && !can(session.role, "task.read", taskAccess)) {
    throw new ForbiddenError();
  }
  const subtask = existing?.subtask_id ? await getSubtaskDetailRowById(existing.subtask_id) : null;
  const subtaskTaskAccess = subtask
    ? await getTaskAccessContext(session.id, subtask.task_id)
    : null;
  if (subtaskTaskAccess && !can(session.role, "task.read", subtaskTaskAccess)) {
    throw new ForbiddenError();
  }

  const row = await getNoteRowById(parsed.data.noteId);

  return {
    row,
    canUpdate:
      row !== null &&
      can(session.role, "note.update", access) &&
      (taskAccess === null || can(session.role, "task.update", taskAccess)) &&
      (subtaskTaskAccess === null || can(session.role, "task.update", subtaskTaskAccess)),
  };
}

export async function getTaskNotesPaginatedAction(
  params: z.input<typeof TaskNotesListQuerySchema>,
): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = TaskNotesListQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  const access = await getTaskAccessContext(session.id, parsed.data.taskId);
  if (!can(session.role, "task.read", access)) {
    throw new ForbiddenError();
  }

  return getTaskNotesPaginated(parsed.data);
}

export async function getSubtaskNotesPaginatedAction(
  params: z.input<typeof SubtaskNotesListQuerySchema>,
): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = SubtaskNotesListQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  const subtask = await getSubtaskDetailRowById(parsed.data.subtaskId);
  if (!subtask) {
    throw new ForbiddenError();
  }
  const access = await getTaskAccessContext(session.id, subtask.task_id);
  if (!can(session.role, "task.read", access)) {
    throw new ForbiddenError();
  }

  return getSubtaskNotesPaginated(parsed.data);
}

export async function getCaseNotesPaginatedAction(
  params: z.input<typeof CaseNotesListQuerySchema>,
): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = CaseNotesListQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  const access = await getCaseAccessContext(session.id, parsed.data.caseId);
  if (!can(session.role, "note.read", access)) {
    throw new ForbiddenError();
  }

  return getCaseNotesPaginated(parsed.data);
}

export async function getCaseNotesWithTaskNotesPaginatedAction(
  params: z.input<typeof CaseNotesListQuerySchema>,
): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = CaseNotesListQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  const access = await getCaseAccessContext(session.id, parsed.data.caseId);
  if (!can(session.role, "note.read", access)) {
    throw new ForbiddenError();
  }

  return getCaseNotesWithTaskNotesPaginated(parsed.data);
}

export async function getConsultationNotesPaginatedAction(
  params: z.input<typeof ConsultationNotesListQuerySchema>,
): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = ConsultationNotesListQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  const access = await getConsultationAccessContext(session.id, parsed.data.consultationId);
  if (!can(session.role, "note.read", access)) {
    throw new ForbiddenError();
  }

  return getConsultationNotesPaginated(parsed.data);
}

export async function createNoteAction(
  payload: z.input<typeof NoteCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = NoteCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("note");

  const { content, case_id, consultation_id, task_id, subtask_id } = parsed.data;

  let note: { id: string };
  let subtask: SubtaskDetailRow | null = null;
  try {
    if (subtask_id) {
      subtask = await getSubtaskDetailRowById(subtask_id);
      if (!subtask) return actionNotFound("Subtask");
      const taskAccess = await getTaskAccessContext(session.id, subtask.task_id);
      if (
        !can(session.role, "task.update", taskAccess) ||
        !can(session.role, "note.create", taskAccess)
      ) {
        return actionForbidden();
      }
    } else if (task_id) {
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

    if (subtask_id && subtask) {
      note = await createNoteForSubtask(subtask_id, {
        content,
        created_by_user_id: session.id,
      });
    } else if (task_id) {
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
        entityType: subtask ? "Case" : task_id ? "Task" : case_id ? "Case" : "Consultation",
        entityId: subtask?.case_id ?? task_id ?? case_id ?? consultation_id!,
        details: `Created note with ID: ${note.id}`,
      }),
    );
  } catch (error) {
    return toActionResponse(error, "create note");
  }

  let parentPath = "/case";
  if (subtask) {
    parentPath = `/case/${subtask.case_id}`;
  } else if (task_id) {
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

    let subtask: SubtaskDetailRow | null = null;
    if (existing.subtask_id) {
      subtask = await getSubtaskDetailRowById(existing.subtask_id);
      if (!subtask) return actionNotFound("Subtask");
      const taskAccess = await getTaskAccessContext(session.id, subtask.task_id);
      if (!can(session.role, "task.update", taskAccess)) {
        return actionForbidden();
      }
    } else if (existing.task_id) {
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
    } else if (existing.subtask_id) {
      await updateNoteForSubtask(existing.subtask_id, noteId, content);
    } else {
      await updateNote(noteId, content);
    }

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "note.updated",
        entityType: subtask
          ? "Case"
          : existing.task_id
            ? "Task"
            : existing.case_id
              ? "Case"
              : "Consultation",
        entityId: (subtask?.case_id ??
          existing.task_id ??
          existing.case_id ??
          existing.consultation_id)!,
        details: `Updated note with ID: ${noteId}`,
      }),
    );

    revalidatePath(
      subtask
        ? `/case/${subtask.case_id}`
        : existing.task_id
          ? `/case/${existing.task?.case_id}`
          : getParentPath(existing),
    );

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

    let subtask: SubtaskDetailRow | null = null;
    if (existing.subtask_id) {
      subtask = await getSubtaskDetailRowById(existing.subtask_id);
      if (!subtask) return actionNotFound("Subtask");
      const taskAccess = await getTaskAccessContext(session.id, subtask.task_id);
      if (!can(session.role, "task.update", taskAccess)) {
        return actionForbidden();
      }
    } else if (existing.task_id) {
      const taskAccess = await getTaskAccessContext(session.id, existing.task_id);
      if (!can(session.role, "task.update", taskAccess)) {
        return actionForbidden();
      }
    }

    if (existing.task_id) {
      await deleteNoteForTask(existing.task_id, noteId);
    } else if (existing.subtask_id) {
      await deleteNoteForSubtask(existing.subtask_id, noteId);
    } else {
      await deleteNote(noteId);
    }

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "note.deleted",
        entityType: subtask
          ? "Case"
          : existing.task_id
            ? "Task"
            : existing.case_id
              ? "Case"
              : "Consultation",
        entityId: (subtask?.case_id ??
          existing.task_id ??
          existing.case_id ??
          existing.consultation_id)!,
        details: `Deleted note with ID: ${noteId}`,
      }),
    );

    revalidatePath(
      subtask
        ? `/case/${subtask.case_id}`
        : existing.task_id
          ? `/case/${existing.task?.case_id}`
          : getParentPath(existing),
    );

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "delete note");
  }
}
