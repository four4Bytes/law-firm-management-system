import { lockTask } from "@/features/tasks/mutations";
import { TaskStatus } from "@/generated/prisma/client";
import { TaskLockedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

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
 * cancelled, then creates the note. Throws TaskLockedError if the task is cancelled.
 */
export async function createNoteForTask(
  taskId: string,
  data: Omit<NoteCreateData, "task_id">,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockTask(tx, taskId);
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (task?.status === TaskStatus.Cancelled) {
      throw new TaskLockedError();
    }
    return tx.note.create({ data: { ...data, task_id: taskId }, select: { id: true } });
  });
}

/**
 * Updates a note attached to a task atomically: locks the task, verifies it is not
 * cancelled, then updates the note. Throws TaskLockedError if the task is cancelled.
 */
export async function updateNoteForTask(
  taskId: string,
  noteId: string,
  content: string,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockTask(tx, taskId);
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (task?.status === TaskStatus.Cancelled) {
      throw new TaskLockedError();
    }
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
 * cancelled, then deletes the note. Throws TaskLockedError if the task is cancelled.
 */
export async function deleteNoteForTask(taskId: string, noteId: string): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockTask(tx, taskId);
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });
    if (task?.status === TaskStatus.Cancelled) {
      throw new TaskLockedError();
    }
    // Verify the note belongs to this task (defense in depth)
    const note = await tx.note.findUnique({ where: { id: noteId }, select: { task_id: true } });
    if (note?.task_id !== taskId) {
      throw new Error("Note does not belong to the specified task");
    }
    return tx.note.delete({ where: { id: noteId }, select: { id: true } });
  });
}
