import { cache } from "react";

import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import { getTaskAccessContext } from "@/features/tasks/queries";
import type { Role, TaskStatus } from "@/generated/prisma/browser";
import { prisma, type TransactionClient } from "@/lib/infra/prisma";
import type { PageQuery } from "@/lib/primitives/types";
import { ForbiddenError } from "@/lib/security/errors";
import { can, type AccessContext } from "@/lib/security/rbac";

export type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploadedBy: string;
  created_at: Date;
  task?: { id: string; title: string; case_id: string } | null;
  case?: { id: string; case_title: string } | null;
  consultation?: { id: string; concern: string } | null;
};

// Display metadata plus the storage key, which the row projection omits because
// presigned-URL callers need it.
export type AuthorizedDocument = DocumentRow & { file_path: string };

export interface DocumentListQuery extends PageQuery {
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
  }: DocumentListQuery): Promise<{
    rows: DocumentRow[];
    nextCursor: string | null;
  }> => {
    const where: Record<string, unknown> = {};
    if (caseId) {
      where.OR = [{ case_id: caseId }, { task: { case_id: caseId } }];
    } else {
      if (consultationId) where.consultation_id = consultationId;
      if (taskId) where.task_id = taskId;
    }
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
        case: { select: { id: true, case_title: true } },
        consultation: { select: { id: true, concern: true } },
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
      case: d.case ?? null,
      consultation: d.consultation ?? null,
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

// Loads a document's display metadata and storage key, after asserting the
// caller may read it (including the parent task, when attached to one).
//
// The two failure modes are deliberately different: `ForbiddenError` for a
// denied read, but `null` for a missing document, so each caller decides how to
// surface absence. Shared by the presigned-URL Server Actions and the full-page
// preview route so authorization lives in exactly one place.
export async function getAuthorizedDocument(
  documentId: string,
  user: { id: string; role: Role },
): Promise<AuthorizedDocument | null> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      file_path: true,
      file_name: true,
      file_type: true,
      file_size: true,
      created_at: true,
      uploadedBy: { select: { name: true } },
      task: { select: { id: true, title: true, case_id: true } },
      case: { select: { id: true, case_title: true } },
      consultation: { select: { id: true, concern: true } },
    },
  });

  if (!document) return null;

  if (document.task) {
    const taskAccess = await getTaskAccessContext(user.id, document.task.id);
    if (!can(user.role, "task.read", taskAccess)) {
      throw new ForbiddenError();
    }
  }

  const access = await getDocumentAccessContext(user.id, document.id);
  if (!can(user.role, "attachment.read", access)) {
    throw new ForbiddenError();
  }

  return {
    id: document.id,
    file_path: document.file_path,
    file_name: document.file_name,
    file_type: document.file_type,
    file_size: document.file_size,
    uploadedBy: document.uploadedBy.name,
    created_at: document.created_at,
    task: document.task,
    case: document.case ?? null,
    consultation: document.consultation ?? null,
  };
}

// Collects the S3 object keys for every document attached to a task, so they
// can be purged before the DB cascade removes the `Document` rows. Never purge
// first: that would leave `Document` rows pointing at missing blobs.
//
// `tx` is optional; the shared Prisma singleton is used when it is omitted.
// Returns the `file_path` values of the task's documents.
export async function getDocumentFilePathsByTaskId(
  taskId: string,
  tx?: TransactionClient,
): Promise<string[]> {
  const documents = await (tx ?? prisma).document.findMany({
    where: { task_id: taskId },
    select: { file_path: true },
  });
  return documents.map((d) => d.file_path);
}

// Collects the S3 object keys for every document attached to a consultation,
// so they can be purged before the DB cascade removes the `Document` rows.
// Returns the `file_path` values of the consultation's documents.
export async function getDocumentFilePathsByConsultationId(
  consultationId: string,
): Promise<string[]> {
  const documents = await prisma.document.findMany({
    where: { consultation_id: consultationId },
    select: { file_path: true },
  });
  return documents.map((d) => d.file_path);
}

// Collects the S3 object keys for every document that a case deletion will
// cascade-remove: documents attached directly to the case and to its tasks.
//
// Consultations are intentionally excluded — deleting a case only unlinks its
// source consultation, so consultation-owned documents must survive.
//
// Returns the `file_path` values of all documents removed by the delete.
export async function getDocumentFilePathsForCaseDeletion(caseId: string): Promise<string[]> {
  const documents = await prisma.document.findMany({
    where: {
      OR: [{ case_id: caseId }, { task: { case_id: caseId } }],
    },
    select: { file_path: true },
  });
  return documents.map((d) => d.file_path);
}

// ----- Access context -----

// `assigned` resolves from the parent Case/Consultation only. Task-attached users are
// covered because task mutations auto-grant Case membership on attach (grantCaseMembership
// in features/tasks/mutations.ts); removing that grant would silently deny task members
// here. Task scoping itself is enforced per action via getTaskAccessContext (see actions.ts).
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
