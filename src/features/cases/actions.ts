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
  getCaseOverviewById,
  getCasesPaginated,
  getCaseTasksPaginated,
  type CaseEditData,
  type CaseMilestoneListRow,
  type CaseOverviewData,
  type CaseRow,
} from "@/features/cases/queries";
import { getConsultationEditData } from "@/features/consultations/queries";
import { notifyRecipients } from "@/features/notifications/notify";
import { diffNewAssigneeIds } from "@/features/notifications/recipients";
import type { TaskRow } from "@/features/tasks/queries";
import { CaseStatus, ConsultationStatus, NotificationType } from "@/generated/prisma/browser";
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
  transitionCaseWithNote,
  updateCase,
  updateCaseStatus,
  updateCaseWithClient,
} from "./mutations";
import {
  CaseCreatePayloadSchema,
  CaseDeletePayloadSchema,
  CaseOverviewIdSchema,
  CasePageQuerySchema,
  CaseStatusChangePayloadSchema,
  CaseUpdatePayloadSchema,
  CaseWithClientCreatePayloadSchema,
  CaseWithClientUpdatePayloadSchema,
} from "./schemas";
import { describeCaseNextSteps, isValidCaseStatusTransition } from "./status";

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

interface ConsultationLinkCheck {
  sourceConsultationId: string;
  clientId: string;
}

async function checkConsultationLink(
  check: ConsultationLinkCheck,
): Promise<ActionStatusResponse | null> {
  const { sourceConsultationId, clientId } = check;
  const existing = await getCaseBySourceConsultationId(sourceConsultationId);
  if (existing) {
    return actionConflict(
      "Case already exists",
      "A case already exists for this consultation. Open the linked case instead of creating a duplicate.",
    );
  }
  const source = await getConsultationEditData(sourceConsultationId);
  if (!source) {
    return actionNotFound("Consultation");
  }
  if (
    source.status !== ConsultationStatus.Completed &&
    source.status !== ConsultationStatus.Accepted
  ) {
    return actionConflict(
      "Consultation cannot become a case",
      `Only completed or accepted consultations can become a case. This consultation is ${source.status.toLowerCase()}. Mark it as completed first.`,
    );
  }
  if (source.client_id !== clientId) {
    return actionConflict(
      "Client mismatch",
      "The case must use the same client as the consultation. Change the client on the case or create it without a consultation link.",
    );
  }
  return null;
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
      const linkError = await checkConsultationLink({
        sourceConsultationId: source_consultation_id,
        clientId: client_id,
      });
      if (linkError) return linkError;
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

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "case.created",
        entityType: "Case",
        entityId: createdCase.id,
        details: `Created case: "${case_title}"`,
      });

      const assigneeIds = assignee_ids ?? [];
      if (assigneeIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: assigneeIds,
          type: NotificationType.CaseAssigned,
          title: `Case assigned: ${case_title}`,
          message: `You have been assigned to case: "${case_title}"`,
          actionUrl: `/case/${createdCase.id}`,
          caseId: createdCase.id,
        });
      }
    });

    revalidatePath("/case");

    return { success: true, data: { id: createdCase.id } };
  } catch (error) {
    return toActionResponse(error, "create case", {
      title: "Case already exists",
      description:
        "A case already exists for this consultation. Open the linked case instead of creating a duplicate.",
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

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "case.created",
        entityType: "Case",
        entityId: createdWithClient.id,
        details: `Created case: "${caseData.case_title}" with client: "${client.name}"`,
      });

      const assigneeIds = caseData.assignee_ids ?? [];
      if (assigneeIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: assigneeIds,
          type: NotificationType.CaseAssigned,
          title: `Case assigned: ${caseData.case_title}`,
          message: `You have been assigned to case: "${caseData.case_title}"`,
          actionUrl: `/case/${createdWithClient.id}`,
          caseId: createdWithClient.id,
        });
      }
    });

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

      const newAssigneeIds = diffNewAssigneeIds(
        assignee_ids ?? existing.assignee_ids,
        existing.assignee_ids,
      );

      if (newAssigneeIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: newAssigneeIds,
          type: NotificationType.CaseAssigned,
          title: `Case assigned: ${case_title}`,
          message: `You have been assigned to case: "${case_title}"`,
          actionUrl: `/case/${caseId}`,
          caseId,
        });
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

      const newAssigneeIds = diffNewAssigneeIds(
        caseData.assignee_ids ?? existing.assignee_ids,
        existing.assignee_ids,
      );

      if (newAssigneeIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: newAssigneeIds,
          type: NotificationType.CaseAssigned,
          title: `Case assigned: ${caseData.case_title}`,
          message: `You have been assigned to case: "${caseData.case_title}"`,
          actionUrl: `/case/${case_id}`,
          caseId: case_id,
        });
      }
    });

    revalidatePath(`/case/${case_id}`);
    revalidatePath("/case");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update case");
  }
}

export async function changeCaseStatusAction(
  payload: z.input<typeof CaseStatusChangePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseStatusChangePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return actionInvalid("case");
  }

  const { caseId, status, reason } = parsed.data;

  try {
    const existing = await getCaseEditData(caseId);
    if (!existing) return actionNotFound("Case");

    await requireCasePermission(session, caseId, "case.update");

    if (!isValidCaseStatusTransition(existing.status as CaseStatus, status)) {
      return actionConflict(
        "Invalid status change",
        `Cannot change a case from ${existing.status} to ${status}. From ${existing.status}, you can: ${describeCaseNextSteps(existing.status as CaseStatus)}.`,
      );
    }

    if (reason && status !== CaseStatus.Open) {
      await transitionCaseWithNote({
        caseId,
        status,
        reason,
        decidedByUserId: session.id,
        expectedStatus: existing.status as CaseStatus,
      });
    } else {
      await updateCaseStatus(caseId, status, existing.status as CaseStatus);
    }

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "case.status_changed",
        entityType: "Case",
        entityId: caseId,
        details: `Changed case status from ${existing.status} to ${status}`,
      });

      const assigneeIds = await getCaseAssigneeIds(caseId);
      if (assigneeIds.length > 0) {
        await notifyRecipients(
          session.id,
          {
            userIds: assigneeIds,
            type: NotificationType.CaseStatusChanged,
            title: `Case status changed: ${existing.case_title.substring(0, 100)}`,
            message: `Case "${existing.case_title.substring(0, 100)}" status changed from ${existing.status} to ${status}.`,
            actionUrl: `/case/${caseId}`,
            caseId,
          },
          "status change",
        );
      }
    });

    revalidatePath(`/case/${caseId}`);
    revalidatePath("/case");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "change case status");
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
