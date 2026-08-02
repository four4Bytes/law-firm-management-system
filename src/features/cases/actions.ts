"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
import {
  getCaseAccessContext,
  getCaseAssigneeIds,
  getCaseBySourceConsultationId,
  getCaseEditData,
  getCaseMilestonesPaginated,
  getCaseNotesPaginated,
  getCaseOverviewById,
  getCasesPaginated,
  getCaseTasksPaginated,
  type CaseEditData,
  type CaseMilestoneListRow,
  type CaseOverviewData,
  type CaseRow,
} from "@/features/cases/queries";
import { getDocumentsPaginated, type DocumentRow } from "@/features/documents/queries";
import type { NoteRow } from "@/features/notes/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import {
  diffNewAssigneeIds,
  resolveAssignmentRecipients,
} from "@/features/notifications/recipients";
import type { TaskRow } from "@/features/tasks/queries";
import { NotificationType } from "@/generated/prisma/browser";
import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import { requireAuth, requirePermission, type AuthenticatedUser } from "@/lib/auth-guards";
import { can, FORBIDDEN_MESSAGE, type AccessContext, type Permission } from "@/lib/rbac";
import { PageQuerySchema } from "@/lib/schemas";

import {
  createCase,
  createCaseWithClient,
  deleteCase,
  updateCase,
  updateCaseWithClient,
} from "./mutations";
import {
  CaseCreatePayloadSchema,
  CaseDeletePayloadSchema,
  CaseOverviewIdSchema,
  CasePageQuerySchema,
  CaseUpdatePayloadSchema,
  CaseWithClientCreatePayloadSchema,
  CaseWithClientUpdatePayloadSchema,
} from "./schemas";

async function requireCasePermission(
  session: AuthenticatedUser,
  caseId: string,
  permission: Permission,
): Promise<AccessContext> {
  const access = await getCaseAccessContext({ userId: session.id, caseId });
  if (!can(session.role, permission, access)) {
    throw new Error("Forbidden");
  }
  return access;
}

export async function getCasesPaginatedAction(params: z.input<typeof PageQuerySchema>): Promise<{
  cases: CaseRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = PageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  const assignedUserId = can(session.role, "case.read") ? undefined : session.id;
  return getCasesPaginated(parsed.data, assignedUserId);
}

export async function getCaseOverviewByIdAction(
  id: string,
): Promise<{ overview: CaseOverviewData; access: AccessContext }> {
  const session = await requireAuth();

  const parsed = CaseOverviewIdSchema.safeParse({ caseId: id });
  if (!parsed.success) {
    throw new Error("Invalid case ID");
  }

  const caseId = parsed.data.caseId;
  const access = await requireCasePermission(session, caseId, "case.read");

  const overview = await getCaseOverviewById(caseId);

  return { overview, access };
}

export async function getCaseTasksPaginatedAction(
  params: z.input<typeof CasePageQuerySchema>,
): Promise<{
  rows: TaskRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  await requireCasePermission(session, parsed.data.caseId, "task.read");

  return getCaseTasksPaginated(parsed.data);
}

export async function getCaseNotesPaginatedAction(
  params: z.input<typeof CasePageQuerySchema>,
): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  await requireCasePermission(session, parsed.data.caseId, "note.read");

  return getCaseNotesPaginated(parsed.data);
}

export async function getCaseDocumentsPaginatedAction(
  params: z.input<typeof CasePageQuerySchema>,
): Promise<{
  rows: DocumentRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  await requireCasePermission(session, parsed.data.caseId, "attachment.read");

  return getDocumentsPaginated(parsed.data);
}

export async function getCaseMilestonesPaginatedAction(
  params: z.input<typeof CasePageQuerySchema>,
): Promise<{
  rows: CaseMilestoneListRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  await requireCasePermission(session, parsed.data.caseId, "milestone.read");

  return getCaseMilestonesPaginated(parsed.data);
}

export async function getCaseForEditAction(id: string): Promise<CaseEditData | null> {
  const session = await requireAuth();

  const parsed = CaseOverviewIdSchema.safeParse({ caseId: id });
  if (!parsed.success) {
    throw new Error("Invalid case ID");
  }

  const caseId = parsed.data.caseId;
  await requireCasePermission(session, caseId, "case.update");

  return getCaseEditData(caseId);
}

export async function createCaseAction(
  payload: z.input<typeof CaseCreatePayloadSchema>,
): Promise<ActionDataResponse<{ caseId: string }>> {
  let session: AuthenticatedUser;
  try {
    session = await requirePermission("case.create");
  } catch {
    return { success: false, error: FORBIDDEN_MESSAGE };
  }

  const parsed = CaseCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case data" };
  }

  const {
    client_id,
    case_title,
    case_type,
    status,
    parties_involved,
    source_consultation_id,
    assignee_ids,
  } = parsed.data;

  if (source_consultation_id) {
    const existing = await getCaseBySourceConsultationId(source_consultation_id);
    if (existing) {
      return { success: false, error: "A case already exists for this consultation" };
    }
  }

  let createdCase: { id: string };
  try {
    createdCase = await createCase({
      client_id,
      case_title,
      case_type,
      status,
      parties_involved: parties_involved || undefined,
      source_consultation_id,
      assignee_ids,
      created_by_user_id: session.id,
    });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "case.created",
          entityType: "Case",
          entityId: createdCase.id,
          details: `Created case: "${case_title}"`,
        });
      } catch (err) {
        console.error("Failed to log case.created audit for Case", createdCase.id, err);
      }

      try {
        const notifyIds = await resolveAssignmentRecipients({
          directUserIds: assignee_ids,
          entityId: createdCase.id,
          getExistingDirectUserIds: getCaseAssigneeIds,
        });

        await dispatchNotifications(
          {
            userIds: notifyIds,
            type: NotificationType.CaseAssigned,
            title: `New case: ${case_title}`,
            message: `A new case "${case_title}" was created`,
            actionUrl: `/case/${createdCase.id}`,
            caseId: createdCase.id,
          },
          session.id,
          notifyIds.includes(session.id),
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }
    });

    revalidatePath("/case");

    return { success: true, data: { caseId: createdCase.id } };
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return { success: false, error: "A case already exists for this consultation" };
    }
    return { success: false, error: "Failed to create case" };
  }
}

export async function createCaseWithClientAction(
  payload: z.input<typeof CaseWithClientCreatePayloadSchema>,
): Promise<ActionStatusResponse> {
  let session: AuthenticatedUser;
  try {
    session = await requirePermission("case.create");
  } catch {
    return { success: false, error: FORBIDDEN_MESSAGE };
  }

  const parsed = CaseWithClientCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case data" };
  }

  const { client, case: caseData } = parsed.data;

  let createdWithClient: { id: string };
  try {
    createdWithClient = await createCaseWithClient({
      client,
      case: caseData,
      created_by_user_id: session.id,
    });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "case.created",
          entityType: "Case",
          entityId: createdWithClient.id,
          details: `Created case: "${caseData.case_title}" with client: "${client.name}"`,
        });
      } catch (err) {
        console.error("Failed to log case.created audit for Case", createdWithClient.id, err);
      }

      try {
        const notifyIds = await resolveAssignmentRecipients({
          directUserIds: caseData.assignee_ids,
          entityId: createdWithClient.id,
          getExistingDirectUserIds: getCaseAssigneeIds,
        });

        await dispatchNotifications(
          {
            userIds: notifyIds,
            type: NotificationType.CaseAssigned,
            title: `New case: ${caseData.case_title}`,
            message: `A new case "${caseData.case_title}" was created for client "${client.name}"`,
            actionUrl: `/case/${createdWithClient.id}`,
            caseId: createdWithClient.id,
          },
          session.id,
          notifyIds.includes(session.id),
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }
    });

    revalidatePath("/case");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to create case" };
  }
}

export async function updateCaseAction(
  payload: z.input<typeof CaseUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case data" };
  }

  const {
    caseId,
    client_id,
    case_title,
    case_type,
    status,
    parties_involved,
    source_consultation_id,
    assignee_ids,
  } = parsed.data;

  try {
    const existing = await getCaseEditData(caseId);
    if (!existing) return { success: false, error: "Case not found" };

    const access = await getCaseAccessContext({ userId: session.id, caseId });
    if (!can(session.role, "case.update", access)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    await updateCase({
      caseId,
      client_id,
      case_title,
      case_type,
      status,
      parties_involved: parties_involved || undefined,
      source_consultation_id,
      assignee_ids,
    });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "case.updated",
          entityType: "Case",
          entityId: caseId,
          details: `Updated case: "${case_title}"`,
        });
      } catch (err) {
        console.error("Failed to log case.updated audit for Case", caseId, err);
      }

      try {
        const notifyIds = await resolveAssignmentRecipients({
          directUserIds: diffNewAssigneeIds(assignee_ids, existing.assignee_ids),
          entityId: caseId,
          getExistingDirectUserIds: getCaseAssigneeIds,
        });

        await dispatchNotifications(
          {
            userIds: notifyIds,
            type: NotificationType.CaseAssigned,
            title: `Case updated: ${case_title}`,
            message: `Case "${case_title}" was updated`,
            actionUrl: `/case/${caseId}`,
            caseId,
          },
          session.id,
          notifyIds.includes(session.id),
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }
    });

    revalidatePath(`/case/${caseId}`);
    revalidatePath("/case");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update case" };
  }
}

export async function updateCaseWithClientAction(
  payload: z.input<typeof CaseWithClientUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseWithClientUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case data" };
  }

  const { case_id, client_id, client, case: caseData } = parsed.data;

  try {
    const existing = await getCaseEditData(case_id);
    if (!existing) return { success: false, error: "Case not found" };

    const access = await getCaseAccessContext({ userId: session.id, caseId: case_id });
    if (!can(session.role, "case.update", access)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    const existingAssigneeIds = await getCaseAssigneeIds(case_id);

    await updateCaseWithClient({
      case_id,
      client_id,
      client,
      case: caseData,
    });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "case.updated",
          entityType: "Case",
          entityId: case_id,
          details: `Updated case: "${caseData.case_title}" with client: "${client.name}"`,
        });
      } catch (err) {
        console.error("Failed to log case.updated audit for Case", case_id, err);
      }

      try {
        const notifyIds = await resolveAssignmentRecipients({
          directUserIds: diffNewAssigneeIds(caseData.assignee_ids, existingAssigneeIds),
          entityId: case_id,
          getExistingDirectUserIds: getCaseAssigneeIds,
        });

        await dispatchNotifications(
          {
            userIds: notifyIds,
            type: NotificationType.CaseAssigned,
            title: `Case updated: ${caseData.case_title}`,
            message: `Case "${caseData.case_title}" was updated for client "${client.name}"`,
            actionUrl: `/case/${case_id}`,
            caseId: case_id,
          },
          session.id,
          notifyIds.includes(session.id),
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }
    });

    revalidatePath(`/case/${case_id}`);
    revalidatePath("/case");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update case" };
  }
}

export async function deleteCaseAction(
  payload: z.input<typeof CaseDeletePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseDeletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case ID" };
  }

  try {
    const existing = await getCaseEditData(parsed.data.caseId);
    if (!existing) return { success: false, error: "Case not found" };

    const access = await getCaseAccessContext({ userId: session.id, caseId: parsed.data.caseId });
    if (!can(session.role, "case.delete", access)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    await deleteCase(parsed.data.caseId);

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "case.deleted",
        entityType: "Case",
        entityId: parsed.data.caseId,
        details: `Deleted case: "${existing.case_title}"`,
      }).catch(console.error),
    );

    revalidatePath("/case");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete case" };
  }
}
