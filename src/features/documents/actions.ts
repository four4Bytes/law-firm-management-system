"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { getParentPath } from "@/lib/path";
import { can, FORBIDDEN_MESSAGE, type AccessContext } from "@/lib/rbac";
import {
  deleteFile,
  generateKey,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  objectExists,
} from "@/lib/s3";

import { createDocument, deleteDocument as deleteDocumentRecord } from "./mutations";
import {
  getDocumentAccessContext,
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

interface DocumentParentPayload {
  userId: string;
  caseId?: string | null;
  consultationId?: string | null;
}

async function getDocumentParentAccessContext({
  userId,
  caseId,
  consultationId,
}: DocumentParentPayload): Promise<AccessContext> {
  if (caseId) {
    return getCaseAccessContext({ userId, caseId });
  }
  if (!consultationId) {
    throw new Error("Invalid query parameters");
  }
  return getConsultationAccessContext({ userId, consultationId });
}

export async function getDocumentsPaginatedAction(
  params: z.input<typeof DocumentPageQuerySchema>,
): Promise<{
  rows: DocumentRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = DocumentPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  const { caseId, consultationId } = parsed.data;

  const parentAccess = await getDocumentParentAccessContext({
    userId: session.id,
    caseId,
    consultationId,
  });
  if (!can(session.role, "attachment.read", parentAccess)) {
    throw new Error("Forbidden");
  }

  return getDocumentsPaginated(parsed.data);
}

export async function getDocumentUploadUrlAction(
  payload: z.input<typeof DocumentUploadPayloadSchema>,
): Promise<{
  key: string;
  uploadUrl: string;
}> {
  const session = await requireAuth();

  const parsed = DocumentUploadPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Invalid upload payload");
  }

  const { file_name, file_type, case_id, consultation_id } = parsed.data;

  const parentAccess = await getDocumentParentAccessContext({
    userId: session.id,
    caseId: case_id,
    consultationId: consultation_id,
  });
  if (!can(session.role, "attachment.create", parentAccess)) {
    throw new Error("Forbidden");
  }

  const parentType = case_id ? "cases" : "consultations";
  const parentId = case_id ?? consultation_id!;
  const key = generateKey(parentType, parentId, file_name);
  const uploadUrl = await getPresignedUploadUrl(key, file_type);

  return { key, uploadUrl };
}

export async function confirmDocumentUploadAction(
  payload: z.input<typeof DocumentConfirmPayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = DocumentConfirmPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid upload confirmation payload" };
  }

  const { file_name, file_type, file_size, file_path, case_id, consultation_id } = parsed.data;

  try {
    const parentAccess = await getDocumentParentAccessContext({
      userId: session.id,
      caseId: case_id,
      consultationId: consultation_id,
    });
    if (!can(session.role, "attachment.create", parentAccess)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    const doc = await createDocument({
      file_name,
      file_path,
      file_type,
      file_size,
      case_id,
      consultation_id,
      uploaded_by_user_id: session.id,
    });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "document.uploaded",
        entityType: case_id ? "Case" : "Consultation",
        entityId: (case_id ?? consultation_id)!,
        details: `Uploaded document: "${file_name}"`,
      }).catch(console.error),
    );

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
  const session = await requireAuth();

  const parsed = DocumentIdSchema.safeParse({ documentId });
  if (!parsed.success) {
    throw new Error("Invalid document ID");
  }

  const doc = await getDocumentById(parsed.data.documentId);
  if (!doc) throw new Error("Document not found");

  const access = await getDocumentAccessContext({
    userId: session.id,
    documentId: doc.id,
  });
  if (!can(session.role, "attachment.read", access)) {
    throw new Error("Forbidden");
  }

  const exists = await objectExists(doc.file_path);
  if (!exists) throw new Error("This file no longer exists in storage. It may have been deleted.");

  const url = await getPresignedDownloadUrl(doc.file_path, doc.file_name);

  return { url, file_name: doc.file_name };
}

export async function getDocumentDetailRowAction(
  documentId: string,
): Promise<{ row: DocumentDetailRow; canDelete: boolean }> {
  const session = await requireAuth();

  const parsed = DocumentIdSchema.safeParse({ documentId });
  if (!parsed.success) {
    throw new Error("Invalid document ID");
  }

  const doc = await getDocumentDetailRowById(parsed.data.documentId);
  if (!doc) throw new Error("Document not found");

  const access = await getDocumentAccessContext({
    userId: session.id,
    documentId: doc.id,
  });
  if (!can(session.role, "attachment.read", access)) {
    throw new Error("Forbidden");
  }

  const parentCaseId = doc.case_id ?? doc.task_case_id ?? null;
  const permission = parentCaseId ? "attachment.delete" : "consultation.attachment.delete";

  return { row: doc, canDelete: can(session.role, permission, access) };
}

export async function deleteDocumentAction(
  payload: z.input<typeof DocumentIdSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = DocumentIdSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid document ID" };
  }

  const { documentId } = parsed.data;

  try {
    const doc = await getDocumentById(documentId);
    if (!doc) return { success: false, error: "Document not found" };

    const parentCaseId = doc.case_id ?? doc.task?.case_id ?? null;
    const access = await getDocumentAccessContext({ userId: session.id, documentId: doc.id });
    const permission = parentCaseId ? "attachment.delete" : "consultation.attachment.delete";
    if (!can(session.role, permission, access)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    await deleteFile(doc.file_path);
    await deleteDocumentRecord(documentId);

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "document.deleted",
        entityType: parentCaseId ? "Case" : "Consultation",
        entityId: parentCaseId ?? doc.consultation_id!,
        details: `Deleted document: "${doc.file_name}"`,
      }).catch(console.error),
    );

    revalidatePath(getParentPath(doc));

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete document" };
  }
}
