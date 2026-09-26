import { prisma } from "@/lib/infra/prisma";
import { deleteFile, listObjects } from "@/lib/infra/s3";

export interface DocumentCreatePayload {
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  case_id?: string | null;
  consultation_id?: string | null;
  task_id?: string | null;
  uploaded_by_user_id: string;
}

export async function createDocument(params: DocumentCreatePayload): Promise<{ id: string }> {
  return prisma.document.create({ data: params, select: { id: true } });
}

export async function deleteDocument(id: string): Promise<{ id: string }> {
  return prisma.document.delete({ where: { id }, select: { id: true } });
}

export interface TaskDocumentPayload extends Omit<DocumentCreatePayload, "task_id"> {
  taskId: string;
}

export async function createDocumentForTask(payload: TaskDocumentPayload): Promise<{ id: string }> {
  const { taskId, ...data } = payload;
  return prisma.document.create({ data: { ...data, task_id: taskId }, select: { id: true } });
}

// Guards the action layer's ownership check: a mismatched task id must not reach
// the delete. No transaction alongside it — no action moves a document between
// tasks, so `task_id` cannot change between the read and the write.
export async function deleteDocumentForTask(
  taskId: string,
  documentId: string,
): Promise<{ id: string }> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { task_id: true },
  });
  if (doc?.task_id !== taskId) {
    throw new Error("Document does not belong to the specified task");
  }
  return deleteDocument(documentId);
}

const GC_GRACE_PERIOD_MS = 60 * 60 * 1000;

/**
 * Reconciles S3 storage against the database by deleting orphaned objects that
 * no longer reference a `Document` row. Invoked by the storage GC cron job; the
 * database is the source of truth, so any bucket key without a matching
 * `file_path` is safe to remove. Objects uploaded more recently than
 * `GC_GRACE_PERIOD_MS` are skipped so blobs whose presigned upload has landed
 * but whose `Document` row is not yet confirmed survive the sweep, and the
 * database is rechecked immediately before each delete to close the race with
 * a concurrent confirmation.
 *
 * @returns The number of orphaned objects deleted.
 */
export async function runStorageGc(): Promise<number> {
  const documents = await prisma.document.findMany({ select: { file_path: true } });
  const knownPaths = new Set(documents.map((document) => document.file_path));

  let removed = 0;
  const now = Date.now();
  for await (const { key, lastModified } of listObjects()) {
    if (knownPaths.has(key)) continue;
    if (lastModified && now - lastModified.getTime() < GC_GRACE_PERIOD_MS) continue;
    const confirmed = await prisma.document.findFirst({
      where: { file_path: key },
      select: { id: true },
    });
    if (confirmed) continue;
    await deleteFile(key);
    removed++;
  }
  return removed;
}
