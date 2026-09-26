import { prisma } from "@/lib/infra/prisma";

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

// Guards the action layer's ownership check: a mismatched task id must not reach
// the write. No transaction alongside it — no action moves a note between tasks,
// so `task_id` cannot change between the read and the write.
async function assertNoteBelongsToTask(taskId: string, noteId: string): Promise<void> {
  const note = await prisma.note.findUnique({ where: { id: noteId }, select: { task_id: true } });
  if (note?.task_id !== taskId) {
    throw new Error("Note does not belong to the specified task");
  }
}

export async function createNoteForTask(
  taskId: string,
  data: Omit<NoteCreateData, "task_id">,
): Promise<{ id: string }> {
  return prisma.note.create({ data: { ...data, task_id: taskId }, select: { id: true } });
}

export async function updateNoteForTask(
  taskId: string,
  noteId: string,
  content: string,
): Promise<{ id: string }> {
  await assertNoteBelongsToTask(taskId, noteId);
  return updateNote(noteId, content);
}

export async function deleteNoteForTask(taskId: string, noteId: string): Promise<{ id: string }> {
  await assertNoteBelongsToTask(taskId, noteId);
  return deleteNote(noteId);
}
