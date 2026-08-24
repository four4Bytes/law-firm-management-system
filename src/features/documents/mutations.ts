import { prisma } from "@/lib/prisma";
import { deleteFile, listObjects } from "@/lib/s3";

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

/**
 * Reconciles S3 storage against the database by deleting orphaned objects that
 * no longer reference a `Document` row. Invoked by the storage GC cron job; the
 * database is the source of truth, so any bucket key without a matching
 * `file_path` is safe to remove.
 *
 * @returns The number of orphaned objects deleted.
 */
export async function runStorageGc(): Promise<number> {
  const documents = await prisma.document.findMany({ select: { file_path: true } });
  const knownPaths = new Set(documents.map((document) => document.file_path));

  let removed = 0;
  for await (const key of listObjects()) {
    if (!knownPaths.has(key)) {
      await deleteFile(key);
      removed++;
    }
  }
  return removed;
}
