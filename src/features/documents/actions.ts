"use server";

import { revalidatePath } from "next/cache";

import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import { requireAuth, requireRole } from "@/lib/auth-guards";
import { getParentPath } from "@/lib/path";
import {
  deleteFile,
  generateKey,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  objectExists,
} from "@/lib/s3";

import { createDocument, deleteDocument as deleteDocumentRecord } from "./mutations";
import {
  getDocumentById,
  getDocumentDetailRowById,
  getDocumentsPaginated,
  type DocumentDetailRow,
  type DocumentRow,
} from "./queries";
import {
  DocumentConfirmPayloadSchema,
  DocumentIdSchema,
  DocumentPageQuerySchema,
  DocumentUploadPayloadSchema,
} from "./schemas";

export async function getDocumentsPaginatedAction(params: unknown): Promise<{
  rows: DocumentRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = DocumentPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getDocumentsPaginated(parsed.data);
}

export async function getDocumentUploadUrlAction(payload: unknown): Promise<{
  key: string;
  uploadUrl: string;
}> {
  await requireAuth();

  const parsed = DocumentUploadPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid upload payload");
  }

  const { file_name, file_type, case_id, consultation_id } = parsed.data;

  const parentType = case_id ? "cases" : "consultations";
  const parentId = case_id ?? consultation_id!;
  const key = generateKey(parentType, parentId, file_name);
  const uploadUrl = await getPresignedUploadUrl(key, file_type);

  return { key, uploadUrl };
}

export async function confirmDocumentUploadAction(
  payload: unknown,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = DocumentConfirmPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid upload confirmation payload" };
  }

  const { file_name, file_type, file_size, file_path, case_id, consultation_id } = parsed.data;

  try {
    const doc = await createDocument({
      file_name,
      file_path,
      file_type,
      file_size,
      case_id,
      consultation_id,
      uploaded_by_user_id: session.id,
    });

    revalidatePath(
      getParentPath({ case_id: case_id ?? null, consultation_id: consultation_id ?? null }),
    );

    return { success: true, data: { id: doc.id } };
  } catch {
    return { success: false, error: "Failed to save document record" };
  }
}

export async function getDocumentDownloadUrlAction(documentId: string): Promise<{
  url: string;
  file_name: string;
}> {
  await requireAuth();

  const parsed = DocumentIdSchema.safeParse({ documentId });
  if (!parsed.success) {
    throw new Error("Invalid document ID");
  }

  const doc = await getDocumentById(parsed.data.documentId);
  if (!doc) throw new Error("Document not found");

  const exists = await objectExists(doc.file_path);
  if (!exists) throw new Error("This file no longer exists in storage. It may have been deleted.");

  const url = await getPresignedDownloadUrl(doc.file_path, doc.file_name);

  return { url, file_name: doc.file_name };
}

export async function getDocumentDetailRowAction(documentId: string): Promise<DocumentDetailRow> {
  await requireAuth();

  const parsed = DocumentIdSchema.safeParse({ documentId });
  if (!parsed.success) {
    throw new Error("Invalid document ID");
  }

  const doc = await getDocumentDetailRowById(parsed.data.documentId);
  if (!doc) throw new Error("Document not found");

  return doc;
}

export async function deleteDocumentAction(documentId: string): Promise<ActionStatusResponse> {
  await requireRole("Admin", "Dev", "BranchManager", "Lawyer");

  const parsed = DocumentIdSchema.safeParse({ documentId });
  if (!parsed.success) {
    return { success: false, error: "Invalid document ID" };
  }

  try {
    const doc = await getDocumentById(parsed.data.documentId);
    if (!doc) return { success: false, error: "Document not found" };

    await deleteFile(doc.file_path);
    await deleteDocumentRecord(parsed.data.documentId);

    revalidatePath(getParentPath(doc));

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete document" };
  }
}
