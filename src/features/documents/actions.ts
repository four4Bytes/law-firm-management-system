"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { TaskStatus } from "@/generated/prisma/browser";
import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { ForbiddenError, TASK_LOCKED_MESSAGE } from "@/lib/errors";
import { getParentPath } from "@/lib/path";
import { can, FORBIDDEN_MESSAGE, type AccessContext } from "@/lib/rbac";
import {
  generateKey,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
  objectExists,
} from "@/lib/s3";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import { createDocument, deleteDocument as deleteDocumentRecord } from "./mutations";
import {
  getDocumentAccessContext,
  getDocumentById,
  getDocumentsPaginated,
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
  taskId?: string | null;
}

async function getDocumentParentAccessContext({
  userId,
  caseId,
  consultationId,
  taskId,
}: DocumentParentPayload): Promise<AccessContext> {
  if (caseId) {
    return getCaseAccessContext(userId, caseId);
  }
  if (taskId) {
    return getTaskAccessContext(userId, taskId);
  }
  if (!consultationId) {
    throw new Error("Invalid query parameters");
  }
  return getConsultationAccessContext(userId, consultationId);
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

  const { caseId, consultationId, taskId } = parsed.data;

  const parentAccess = await getDocumentParentAccessContext({
    userId: session.id,
    caseId,
    consultationId,
    taskId,
  });
  if (!can(session.role, taskId ? "task.read" : "attachment.read", parentAccess)) {
    throw new ForbiddenError();
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

  const { file_name, file_type, case_id, consultation_id, task_id } = parsed.data;

  const parentAccess = await getDocumentParentAccessContext({
    userId: session.id,
    caseId: case_id,
    consultationId: consultation_id,
    taskId: task_id,
  });
  if (!can(session.role, task_id ? "task.update" : "attachment.create", parentAccess)) {
    throw new ForbiddenError();
  }

  if (task_id) {
    const task = await getTaskById(task_id);
    if (task?.status === TaskStatus.Cancelled) {
      throw new Error(TASK_LOCKED_MESSAGE);
    }
  }

  const parentType = case_id ? "cases" : task_id ? "tasks" : "consultations";
  const parentId = case_id ?? task_id ?? consultation_id!;
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

  const { file_name, file_type, file_size, file_path, case_id, consultation_id, task_id } =
    parsed.data;

  try {
    const parentAccess = await getDocumentParentAccessContext({
      userId: session.id,
      caseId: case_id,
      consultationId: consultation_id,
      taskId: task_id,
    });
    if (!can(session.role, task_id ? "task.update" : "attachment.create", parentAccess)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    if (task_id) {
      const parentTask = await getTaskById(task_id);
      if (parentTask?.status === TaskStatus.Cancelled) {
        return { success: false, error: TASK_LOCKED_MESSAGE };
      }
    }

    const doc = await createDocument({
      file_name,
      file_path,
      file_type,
      file_size,
      case_id,
      consultation_id,
      task_id,
      uploaded_by_user_id: session.id,
    });

    const taskCaseId = task_id ? ((await getTaskById(task_id))?.case_id ?? null) : null;
    const resultCaseId = case_id ?? taskCaseId;

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "document.uploaded",
        entityType: resultCaseId ? "Case" : "Consultation",
        entityId: (case_id ?? taskCaseId ?? consultation_id)!,
        details: `Uploaded document: "${file_name}"`,
      }),
    );

    revalidatePath(
      getParentPath({
        case_id: case_id ?? taskCaseId,
        consultation_id: consultation_id ?? null,
      }),
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

  if (doc.task_id) {
    const taskAccess = await getTaskAccessContext(session.id, doc.task_id);
    if (!can(session.role, "task.read", taskAccess)) {
      throw new ForbiddenError();
    }
  }

  const access = await getDocumentAccessContext(session.id, doc.id);
  if (!can(session.role, "attachment.read", access)) {
    throw new ForbiddenError();
  }

  const exists = await objectExists(doc.file_path);
  if (!exists) throw new Error("This file no longer exists in storage. It may have been deleted.");

  const url = await getPresignedDownloadUrl(doc.file_path, doc.file_name);

  return { url, file_name: doc.file_name };
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

    if (doc.task?.status === TaskStatus.Cancelled) {
      return { success: false, error: TASK_LOCKED_MESSAGE };
    }

    const parentCaseId = doc.case_id ?? doc.task?.case_id ?? null;
    const access = await getDocumentAccessContext(session.id, doc.id);
    const permission = parentCaseId ? "attachment.delete" : "consultation.attachment.delete";
    if (!can(session.role, permission, access)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    if (doc.task_id) {
      const taskAccess = await getTaskAccessContext(session.id, doc.task_id);
      if (!can(session.role, "task.update", taskAccess)) {
        return { success: false, error: FORBIDDEN_MESSAGE };
      }
    }

    await deleteDocumentRecord(documentId);
    await deleteDocumentFiles([doc.file_path]);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "document.deleted",
        entityType: parentCaseId ? "Case" : "Consultation",
        entityId: parentCaseId ?? doc.consultation_id!,
        details: `Deleted document: "${doc.file_name}"`,
      }),
    );

    revalidatePath(
      getParentPath({
        case_id: parentCaseId,
        consultation_id: doc.consultation_id,
      }),
    );

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete document" };
  }
}
