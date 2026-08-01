import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type { AccessContext } from "@/lib/rbac";

export type NoteRow = {
  id: string;
  content: string;
  author: string;
  created_by_user_id: string;
  created_at: Date;
};

export interface NoteAccessPayload {
  userId: string;
  noteId: string;
}

export const getNoteById = cache(async (id: string) => {
  return prisma.note.findUnique({
    where: { id },
    select: {
      id: true,
      content: true,
      case_id: true,
      consultation_id: true,
      task_id: true,
      created_by_user_id: true,
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
      created_by_user_id: true,
      createdBy: { select: { name: true } },
    },
  });

  if (!note) return null;

  return {
    id: note.id,
    content: note.content,
    author: note.createdBy.name,
    created_by_user_id: note.created_by_user_id,
    created_at: note.created_at,
  };
});

// ----- Access context -----

export const getNoteAccessContext = cache(
  async ({ userId, noteId }: NoteAccessPayload): Promise<AccessContext> => {
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
    const parentConsultationId = note.consultation_id;

    const assignment = parentCaseId
      ? await prisma.caseAssignment.findFirst({
          where: { case_id: parentCaseId, user_id: userId },
          select: { id: true },
        })
      : parentConsultationId
        ? await prisma.consultationAssignment.findFirst({
            where: { consultation_id: parentConsultationId, user_id: userId },
            select: { id: true },
          })
        : null;

    return {
      assigned: assignment !== null,
      own: note.created_by_user_id === userId,
    };
  },
);
