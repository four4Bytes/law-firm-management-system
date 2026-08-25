"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
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
import type { NoteRow } from "@/features/notes/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { diffNewAssigneeIds } from "@/features/notifications/recipients";
import type { TaskRow } from "@/features/tasks/queries";
import { NotificationType } from "@/generated/prisma/browser";
import { Prisma } from "@/generated/prisma/client";
import {
  actionConflict,
  actionForbidden,
  actionInvalid,
  actionNotFound,
  type ActionDataResponse,
  type ActionStatusResponse,
} from "@/lib/action-response";
import {
  assertRecordPermission,
  requireAuth,
  requirePermission,
  type AuthenticatedUser,
} from "@/lib/auth-guards";
import { toActionResponse } from "@/lib/errors";
import { can, type AccessContext, type Permission } from "@/lib/rbac";
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
): Promise<ActionDataResponse<{ id: string }>> {
  try {
    const session = await requirePermission("case.create");

    const parsed = CaseCreatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("case");
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
        return actionConflict(
          "Case already exists",
          "A case already exists for this consultation.",
        );
      }
    }

    const createdCase = await createCase({
      client_id,
      case_title,
      case_type,
      status,
      parties_involved: parties_involved || undefined,
      source_consultation_id,
      assignee_ids,
      created_by_user_id: session.id,
    });

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "case.created",
        entityType: "Case",
        entityId: createdCase.id,
        details: `Created case: "${case_title}"`,
      }),
    );

    revalidatePath("/case");

    return { success: true, data: { id: createdCase.id } };
  } catch (error) {
    return toActionResponse(error, "create case", {
      title: "Case already exists",
      description: "A case already exists for this consultation.",
    });
  }
}

export async function createCaseWithClientAction(
  payload: z.input<typeof CaseWithClientCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  try {
    const session = await requirePermission("case.create");

    const parsed = CaseWithClientCreatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("case");
    }

    const { client, case: caseData } = parsed.data;

    const createdWithClient = await createCaseWithClient({
      client,
      case: caseData,
      created_by_user_id: session.id,
    });

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "case.created",
        entityType: "Case",
        entityId: createdWithClient.id,
        details: `Created case: "${caseData.case_title}" with client: "${client.name}"`,
      }),
    );

    revalidatePath("/case");

    return { success: true, data: { id: createdWithClient.id } };
  } catch (error) {
    return toActionResponse(error, "create case");
  }
}

export async function updateCaseAction(
  payload: z.input<typeof CaseUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return actionInvalid("case");
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
    if (!existing) return actionNotFound("Case");

    if (!(await hasCasePermission(session, caseId, "case.update"))) {
      return actionForbidden();
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
      await logAudit({
        actorUserId: session.id,
        action: "case.updated",
        entityType: "Case",
        entityId: caseId,
        details: `Updated case: "${case_title}"`,
      });

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

      try {
        if (existing.status !== status) {
          const assigneeIds = await getCaseAssigneeIds(caseId);
          if (assigneeIds.length > 0) {
            await dispatchNotifications(
              {
                userIds: assigneeIds,
                type: NotificationType.CaseStatusChanged,
                title: `Case status changed: ${case_title}`,
                message: `Case "${case_title}" status changed from ${existing.status} to ${status}`,
                actionUrl: `/case/${caseId}`,
                caseId,
              },
              session.id,
            );
          }
        }
      } catch (err) {
        console.error("Failed to dispatch status change notification:", err);
      }
    });

    revalidatePath(`/case/${caseId}`);
    revalidatePath("/case");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update case");
  }
}

export async function updateCaseWithClientAction(
  payload: z.input<typeof CaseWithClientUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseWithClientUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return actionInvalid("case");
  }

  const { case_id, client_id, client, case: caseData } = parsed.data;

  try {
    const existing = await getCaseEditData(case_id);
    if (!existing) return actionNotFound("Case");

    if (!(await hasCasePermission(session, case_id, "case.update"))) {
      return actionForbidden();
    }

    await updateCaseWithClient({
      case_id,
      client_id,
      client,
      case: caseData,
    });

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "case.updated",
        entityType: "Case",
        entityId: case_id,
        details: `Updated case: "${caseData.case_title}" with client: "${client.name}"`,
      });

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

      try {
        if (existing.status !== caseData.status) {
          const assigneeIds = await getCaseAssigneeIds(case_id);
          if (assigneeIds.length > 0) {
            await dispatchNotifications(
              {
                userIds: assigneeIds,
                type: NotificationType.CaseStatusChanged,
                title: `Case status changed: ${caseData.case_title}`,
                message: `Case "${caseData.case_title}" status changed from ${existing.status} to ${caseData.status}`,
                actionUrl: `/case/${case_id}`,
                caseId: case_id,
              },
              session.id,
            );
          }
        }
      } catch (err) {
        console.error("Failed to dispatch status change notification:", err);
      }
    });

    revalidatePath(`/case/${case_id}`);
    revalidatePath("/case");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update case");
  }
}

export async function deleteCaseAction(
  payload: z.input<typeof CaseDeletePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseDeletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return actionInvalid("case");
  }

  try {
    const existing = await getCaseEditData(parsed.data.caseId);
    if (!existing) return actionNotFound("Case");

    if (!(await hasCasePermission(session, parsed.data.caseId, "case.delete"))) {
      return actionForbidden();
    }

    await deleteCase(parsed.data.caseId);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "case.deleted",
        entityType: "Case",
        entityId: parsed.data.caseId,
        details: `Deleted case: "${existing.case_title}"`,
      }),
    );

    revalidatePath("/case");

    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return actionNotFound("Case");
    }
    return toActionResponse(error, "delete case");
  }
}
