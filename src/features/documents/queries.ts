import { cache } from "react";

import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import type { TaskStatus } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";
import type { AccessContext } from "@/lib/rbac";
import type { PageQuery } from "@/lib/types";

export type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploadedBy: string;
  created_at: Date;
  task?: { id: string; title: string; case_id: string } | null;
};

export interface DocumentPageQuery extends PageQuery {
  caseId?: string;
  consultationId?: string;
  taskId?: string;
}

export interface DocumentAccessPayload {
  userId: string;
  documentId: string;
}

export const getDocumentsPaginated = cache(
  async ({
    caseId,
    consultationId,
    taskId,
    search = "",
    cursor,
    pageSize = 20,
    sort,
  }: DocumentPageQuery): Promise<{
    rows: DocumentRow[];
    nextCursor: string | null;
  }> => {
    const where: Record<string, unknown> = {};
    if (caseId) where.case_id = caseId;
    if (consultationId) where.consultation_id = consultationId;
    if (taskId) where.task_id = taskId;
    if (search) {
      where.file_name = { contains: search, mode: "insensitive" as const };
    }

    const defaultOrderBy = { created_at: "desc" } as const;

    const orderBy =
      sort?.column === "file_name"
        ? [{ file_name: sort.direction }, { id: "asc" as const }]
        : sort?.column === "file_type"
          ? [{ file_type: sort.direction }, { id: "asc" as const }]
          : sort?.column === "file_size"
            ? [{ file_size: sort.direction }, { id: "asc" as const }]
            : sort?.column === "created_at"
              ? [{ created_at: sort.direction }, { id: "asc" as const }]
              : defaultOrderBy;

    const documents = await prisma.document.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
      include: {
        uploadedBy: { select: { name: true } },
        task: { select: { id: true, title: true, case_id: true } },
      },
    });

    const hasMore = documents.length > pageSize;
    if (hasMore) documents.pop();

    const rows: DocumentRow[] = documents.map((d) => ({
      id: d.id,
      file_name: d.file_name,
      file_type: d.file_type,
      file_size: d.file_size,
      uploadedBy: d.uploadedBy.name,
      created_at: d.created_at,
      task: d.task,
    }));

    return {
      rows,
      nextCursor: hasMore ? documents[documents.length - 1].id : null,
    };
  },
);

export const getDocumentById = cache(
  async (
    id: string,
  ): Promise<{
    id: string;
    file_path: string;
    file_name: string;
    case_id: string | null;
    consultation_id: string | null;
    task_id: string | null;
    task: { case_id: string | null; status: TaskStatus } | null;
  } | null> => {
    return prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        file_path: true,
        file_name: true,
        case_id: true,
        consultation_id: true,
        task_id: true,
        task: { select: { case_id: true, status: true } },
      },
    });
  },
);

/**
 * Collects the S3 object keys for every document attached to a task, so they
 * can be purged before the DB cascade removes the `Document` rows.
 *
 * @param taskId - The task whose document files should be collected.
 * @returns The `file_path` values of the task's documents.
 */
export async function getDocumentFilePathsByTaskId(taskId: string): Promise<string[]> {
  const documents = await prisma.document.findMany({
    where: { task_id: taskId },
    select: { file_path: true },
  });
  return documents.map((d) => d.file_path);
}

/**
 * Collects the S3 object keys for every document attached to a consultation,
 * so they can be purged before the DB cascade removes the `Document` rows.
 *
 * @param consultationId - The consultation whose document files should be collected.
 * @returns The `file_path` values of the consultation's documents.
 */
export async function getDocumentFilePathsByConsultationId(
  consultationId: string,
): Promise<string[]> {
  const documents = await prisma.document.findMany({
    where: { consultation_id: consultationId },
    select: { file_path: true },
  });
  return documents.map((d) => d.file_path);
}

/**
 * Collects the S3 object keys for every document that a case deletion will
 * cascade-remove: documents attached directly to the case, to its tasks, and
 * to its consultations.
 *
 * @param caseId - The case whose document files should be collected.
 * @returns The `file_path` values of all documents removed by the delete.
 */
export async function getDocumentFilePathsForCaseDeletion(caseId: string): Promise<string[]> {
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { case_id: caseId },
        { task: { case_id: caseId } },
        { consultation: { case_id: caseId } },
      ],
    },
    select: { file_path: true },
  });
  return documents.map((d) => d.file_path);
}

// ----- Access context -----

export const getDocumentAccessContext = cache(
  async (userId: string, documentId: string): Promise<AccessContext> => {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        uploaded_by_user_id: true,
        case_id: true,
        consultation_id: true,
        task: { select: { case_id: true } },
      },
    });

    if (!document) {
      return { assigned: false, own: false };
    }

    const parentCaseId = document.case_id ?? document.task?.case_id ?? null;
    const parentAccess = parentCaseId
      ? await getCaseAccessContext(userId, parentCaseId)
      : document.consultation_id
        ? await getConsultationAccessContext(userId, document.consultation_id)
        : null;

    return {
      assigned: parentAccess?.assigned ?? false,
      own: document.uploaded_by_user_id === userId,
    };
  },
);
