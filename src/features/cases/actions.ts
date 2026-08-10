"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
import {
  getCaseAccessContext,
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
import type { NoteRow } from "@/features/notes/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { diffNewAssigneeIds } from "@/features/notifications/recipients";
import type { TaskRow } from "@/features/tasks/queries";
import { NotificationType } from "@/generated/prisma/browser";
import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import {
  assertRecordPermission,
  requireAuth,
  requirePermissionOrNull,
  type AuthenticatedUser,
} from "@/lib/auth-guards";
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
  const access = await getCaseAccessContext(session.id, caseId);
  return assertRecordPermission(session, permission, access);
}

async function hasCasePermission(
  session: AuthenticatedUser,
  caseId: string,
  permission: Permission,
): Promise<boolean> {
  const access = await getCaseAccessContext(session.id, caseId);
  return can(session.role, permission, access);
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
  const session = await requirePermissionOrNull("case.create");
  if (!session) {
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
  const session = await requirePermissionOrNull("case.create");
  if (!session) {
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

    if (!(await hasCasePermission(session, caseId, "case.update"))) {
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
        const newAssigneeIds = diffNewAssigneeIds(
          assignee_ids ?? existing.assignee_ids,
          existing.assignee_ids,
        );

        if (newAssigneeIds.length > 0) {
          await dispatchNotifications(
            {
              userIds: newAssigneeIds,
              type: NotificationType.CaseAssigned,
              title: `Case assigned: ${case_title}`,
              message: `You have been assigned to case: "${case_title}"`,
              actionUrl: `/case/${caseId}`,
              caseId,
            },
            session.id,
          );
        }
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

    if (!(await hasCasePermission(session, case_id, "case.update"))) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

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
        const newAssigneeIds = diffNewAssigneeIds(
          caseData.assignee_ids ?? existing.assignee_ids,
          existing.assignee_ids,
        );

        if (newAssigneeIds.length > 0) {
          await dispatchNotifications(
            {
              userIds: newAssigneeIds,
              type: NotificationType.CaseAssigned,
              title: `Case assigned: ${caseData.case_title}`,
              message: `You have been assigned to case: "${caseData.case_title}"`,
              actionUrl: `/case/${case_id}`,
              caseId: case_id,
            },
            session.id,
          );
        }
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

    if (!(await hasCasePermission(session, parsed.data.caseId, "case.delete"))) {
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
