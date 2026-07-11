import { prisma } from "@/lib/prisma";

export interface NoteCreateData {
  content: string;
  case_id?: string | null;
  consultation_id?: string | null;
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
