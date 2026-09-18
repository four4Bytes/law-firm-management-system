import { TaskStatus } from "@/generated/prisma/browser";
import { RecordLockedError, TaskLockedError } from "@/lib/errors";
import { isSubdataLocked } from "@/lib/lifecycle";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { lockCaseRow, lockConsultationRow, lockTaskRow } from "@/lib/row-locks";

export interface NoteCreateData {
  content: string;
  case_id?: string | null;
  consultation_id?: string | null;
  task_id?: string | null;
  created_by_user_id: string;
}

export async function createNote(data: NoteCreateData): Promise<{ id: string }> {
  return prisma.note.create({ data, select: { id: true } });
}

export async function updateNote(id: string, content: string): Promise<{ id: string }> {
  return prisma.note.update({ where: { id }, data: { content }, select: { id: true } });
}

export async function deleteNote(id: string): Promise<{ id: string }> {
  return prisma.note.delete({ where: { id }, select: { id: true } });
}

/**
 * Creates a note attached to a task atomically: locks the task, verifies it is not
 * done, then creates the note. Throws TaskLockedError if the task is done.
 */
export async function createNoteForTask(
  taskId: string,
  data: Omit<NoteCreateData, "task_id">,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockTaskRow(tx, taskId);
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (task?.status === TaskStatus.Done) {
      throw new TaskLockedError();
    }
    return tx.note.create({ data: { ...data, task_id: taskId }, select: { id: true } });
  });
}

/**
 * Updates a note attached to a task atomically: locks the task, verifies it is not
 * done, then updates the note. Throws TaskLockedError if the task is done.
 */
async function assertTaskParentCaseUnlocked(tx: TransactionClient, taskId: string): Promise<void> {
  const task = await tx.task.findUnique({
    where: { id: taskId },
    select: { case_id: true },
  });
  if (!task?.case_id) return;
  await lockCaseRow(tx, task.case_id);
  const parent = await tx.case.findUnique({
    where: { id: task.case_id },
    select: { status: true },
  });
  if (parent && isSubdataLocked("case", parent.status)) {
    throw new RecordLockedError("Case");
  }
}

/**
 * Updates a note atomically with its parent lock check: locks the parent
 * consultation/case row, refuses when locked, then updates. Closes the
 * read-then-mutate race in the action layer.
 */
export async function updateNoteWithParentCheck(
  noteId: string,
  content: string,
  parent: { consultation_id: string | null; case_id: string | null },
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    if (parent.consultation_id) {
      await lockConsultationRow(tx, parent.consultation_id);
      const consultation = await tx.consultation.findUnique({
        where: { id: parent.consultation_id },
        select: { status: true },
      });
      if (consultation && isSubdataLocked("consultation", consultation.status)) {
        throw new RecordLockedError("Consultation");
      }
    }
    if (parent.case_id) {
      await lockCaseRow(tx, parent.case_id);
      const record = await tx.case.findUnique({
        where: { id: parent.case_id },
        select: { status: true },
      });
      if (record && isSubdataLocked("case", record.status)) {
        throw new RecordLockedError("Case");
      }
    }
    return tx.note.update({ where: { id: noteId }, data: { content }, select: { id: true } });
  });
}

/**
 * Deletes a note atomically with its parent lock check: locks the parent
 * consultation/case row, refuses when locked, then deletes.
 */
export async function deleteNoteWithParentCheck(
  noteId: string,
  parent: { consultation_id: string | null; case_id: string | null },
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    if (parent.consultation_id) {
      await lockConsultationRow(tx, parent.consultation_id);
      const consultation = await tx.consultation.findUnique({
        where: { id: parent.consultation_id },
        select: { status: true },
      });
      if (consultation && isSubdataLocked("consultation", consultation.status)) {
        throw new RecordLockedError("Consultation");
      }
    }
    if (parent.case_id) {
      await lockCaseRow(tx, parent.case_id);
      const record = await tx.case.findUnique({
        where: { id: parent.case_id },
        select: { status: true },
      });
      if (record && isSubdataLocked("case", record.status)) {
        throw new RecordLockedError("Case");
      }
    }
    return tx.note.delete({ where: { id: noteId }, select: { id: true } });
  });
}

/**
 * Updates a note attached to a task atomically: locks the task, verifies it is not
 * done, verifies the parent case is unlocked, then updates the note.
 * Throws TaskLockedError if the task is done, RecordLockedError if the case is locked.
 */
export async function updateNoteForTask(
  taskId: string,
  noteId: string,
  content: string,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockTaskRow(tx, taskId);
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (task?.status === TaskStatus.Done) {
      throw new TaskLockedError();
    }
    await assertTaskParentCaseUnlocked(tx, taskId);
    // Verify the note belongs to this task (defense in depth)
    const note = await tx.note.findUnique({ where: { id: noteId }, select: { task_id: true } });
    if (note?.task_id !== taskId) {
      throw new Error("Note does not belong to the specified task");
    }
    return tx.note.update({ where: { id: noteId }, data: { content }, select: { id: true } });
  });
}

/**
 * Deletes a note attached to a task atomically: locks the task, verifies it is not
 * done, verifies the parent case is unlocked, then deletes the note.
 * Throws TaskLockedError if the task is done, RecordLockedError if the case is locked.
 */
export async function deleteNoteForTask(taskId: string, noteId: string): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockTaskRow(tx, taskId);
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (task?.status === TaskStatus.Done) {
      throw new TaskLockedError();
    }
    await assertTaskParentCaseUnlocked(tx, taskId);
    // Verify the note belongs to this task (defense in depth)
    const note = await tx.note.findUnique({ where: { id: noteId }, select: { task_id: true } });
    if (note?.task_id !== taskId) {
      throw new Error("Note does not belong to the specified task");
    }
    return tx.note.delete({ where: { id: noteId }, select: { id: true } });
  });
}
