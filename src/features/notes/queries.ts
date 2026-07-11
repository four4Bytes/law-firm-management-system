import { prisma } from "@/lib/prisma";

export type NoteRow = {
  id: string;
  content: string;
  author: string;
  created_at: Date;
};

export async function getNoteById(id: string) {
  return prisma.note.findUnique({
    where: { id },
    select: {
      id: true,
      content: true,
      case_id: true,
      consultation_id: true,
      createdBy: { select: { name: true } },
    },
  });
}

export async function getNoteRowById(id: string): Promise<NoteRow | null> {
  const note = await prisma.note.findUnique({
    where: { id },
    select: {
      id: true,
      content: true,
      created_at: true,
      createdBy: { select: { name: true } },
    },
  });

  if (!note) return null;

  return {
    id: note.id,
    content: note.content,
    author: note.createdBy.name,
    created_at: note.created_at,
  };
}
