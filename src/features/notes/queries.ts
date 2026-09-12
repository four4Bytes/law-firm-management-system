import { cache } from "react";

import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import { prisma } from "@/lib/prisma";
import type { AccessContext } from "@/lib/rbac";
import type { CasePageQuery, TaskPageQuery } from "@/lib/types";

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
      task_id: true,
      task: { select: { case_id: true } },
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

export const getTaskNotesPaginated = cache(
  async ({
    taskId,
    search = "",
    cursor,
    pageSize = 20,
  }: TaskPageQuery): Promise<{
    rows: NoteRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      task_id: taskId,
      ...(search ? { content: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const orderBy = { created_at: "desc" } as const;

    const notes = await prisma.note.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
      include: {
        createdBy: { select: { name: true } },
      },
    });

    const hasMore = notes.length > pageSize;
    if (hasMore) notes.pop();

    const rows: NoteRow[] = notes.map((n) => ({
      id: n.id,
      content: n.content,
      author: n.createdBy.name,
      created_at: n.created_at,
    }));

    return { rows, nextCursor: hasMore ? notes[notes.length - 1].id : null };
  },
);

export const getCaseNotesPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
  }: CasePageQuery): Promise<{
    rows: NoteRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      case_id: caseId,
      ...(search ? { content: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const orderBy = { created_at: "desc" } as const;

    const notes = await prisma.note.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
      include: {
        createdBy: { select: { name: true } },
      },
    });

    const hasMore = notes.length > pageSize;
    if (hasMore) notes.pop();

    const rows: NoteRow[] = notes.map((n) => ({
      id: n.id,
      content: n.content,
      author: n.createdBy.name,
      created_at: n.created_at,
    }));

    return { rows, nextCursor: hasMore ? notes[notes.length - 1].id : null };
  },
);

export const getCaseNotesWithTaskNotesPaginated = cache(
  async ({
    caseId,
    search = "",
    cursor,
    pageSize = 20,
  }: CasePageQuery): Promise<{
    rows: NoteRow[];
    nextCursor: string | null;
  }> => {
    const where = {
      OR: [{ case_id: caseId }, { task: { case_id: caseId } }],
      ...(search ? { content: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const orderBy = [{ created_at: "desc" as const }, { id: "asc" as const }];

    const notes = await prisma.note.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
      include: {
        createdBy: { select: { name: true } },
      },
    });

    const hasMore = notes.length > pageSize;
    if (hasMore) notes.pop();

    const rows: NoteRow[] = notes.map((n) => ({
      id: n.id,
      content: n.content,
      author: n.createdBy.name,
      created_at: n.created_at,
    }));

    return { rows, nextCursor: hasMore ? notes[notes.length - 1].id : null };
  },
);
