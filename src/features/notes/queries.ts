import { cache } from "react";

import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import { prisma } from "@/lib/prisma";
import type { AccessContext } from "@/lib/rbac";

export type NoteRow = {
  id: string;
  content: string;
  author: string;
  created_at: Date;
};

export const getNoteById = cache(async (id: string) => {
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
});

export const getNoteRowById = cache(async (id: string): Promise<NoteRow | null> => {
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
});

// ----- Access context -----

export const getNoteAccessContext = cache(
  async (userId: string, noteId: string): Promise<AccessContext> => {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      select: {
        created_by_user_id: true,
        case_id: true,
        consultation_id: true,
        task: { select: { case_id: true } },
      },
    });

    if (!note) {
      return { assigned: false, own: false };
    }

    const parentCaseId = note.case_id ?? note.task?.case_id ?? null;
    const parentAccess = parentCaseId
      ? await getCaseAccessContext(userId, parentCaseId)
      : note.consultation_id
        ? await getConsultationAccessContext(userId, note.consultation_id)
        : null;

    return {
      assigned: parentAccess?.assigned ?? false,
      own: note.created_by_user_id === userId,
    };
  },
);
