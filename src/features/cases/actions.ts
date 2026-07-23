"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
import {
  getCaseEditData,
  getCaseMilestonesPaginated,
  getCaseNotesPaginated,
  getCaseOverviewById,
  getCasePaymentsPaginated,
  getCasesPaginated,
  getCaseTasksPaginated,
  type CaseEditData,
  type CaseMilestoneListRow,
  type CaseOverviewData,
  type CaseRow,
  type NoteRow,
  type PaymentRow,
} from "@/features/cases/queries";
import { getDocumentsPaginated, type DocumentRow } from "@/features/documents/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import type { TaskRow } from "@/features/tasks/queries";
import { getActiveUserIdsByRoles } from "@/features/users/queries";
import { NotificationType } from "@/generated/prisma/browser";
import type { ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { notificationRoleConfig } from "@/lib/notification-config";
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

export async function getCasesPaginatedAction(params: z.input<typeof PageQuerySchema>): Promise<{
  cases: CaseRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = PageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCasesPaginated(parsed.data);
}

export async function getCaseOverviewByIdAction(id: string): Promise<CaseOverviewData> {
  await requireAuth();

  const parsed = CaseOverviewIdSchema.safeParse({ caseId: id });
  if (!parsed.success) {
    throw new Error("Invalid case ID");
  }

  return getCaseOverviewById(parsed.data.caseId);
}

export async function getCaseTasksPaginatedAction(
  params: z.input<typeof CasePageQuerySchema>,
): Promise<{
  rows: TaskRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCaseTasksPaginated(parsed.data);
}

export async function getCaseNotesPaginatedAction(
  params: z.input<typeof CasePageQuerySchema>,
): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCaseNotesPaginated(parsed.data);
}

export async function getCaseDocumentsPaginatedAction(
  params: z.input<typeof CasePageQuerySchema>,
): Promise<{
  rows: DocumentRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getDocumentsPaginated(parsed.data);
}

export async function getCaseMilestonesPaginatedAction(
  params: z.input<typeof CasePageQuerySchema>,
): Promise<{
  rows: CaseMilestoneListRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCaseMilestonesPaginated(parsed.data);
}

export async function getCasePaymentsPaginatedAction(
  params: z.input<typeof CasePageQuerySchema>,
): Promise<{
  rows: PaymentRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCasePaymentsPaginated(parsed.data);
}

export async function getCaseForEditAction(id: string): Promise<CaseEditData | null> {
  await requireAuth();

  const parsed = CaseOverviewIdSchema.safeParse({ caseId: id });
  if (!parsed.success) {
    throw new Error("Invalid case ID");
  }

  return getCaseEditData(parsed.data.caseId);
}

export async function createCaseAction(
  payload: z.input<typeof CaseCreatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case data" };
  }

  const { client_id, case_title, case_type, status, parties_involved, source_consultation_id } =
    parsed.data;

  let createdCase: { id: string };
  try {
    createdCase = await createCase({
      client_id,
      case_title,
      case_type,
      status,
      parties_involved: parties_involved || undefined,
      source_consultation_id,
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
        const adminIds = await getActiveUserIdsByRoles({
          roles: notificationRoleConfig[NotificationType.CaseAssigned],
        });
        await dispatchNotifications(
          {
            userIds: adminIds,
            type: NotificationType.CaseAssigned,
            title: `New case: ${case_title}`,
            message: `A new case "${case_title}" was created`,
            actionUrl: `/case/${createdCase.id}`,
            caseId: createdCase.id,
          },
          session.id,
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

export async function createCaseWithClientAction(
  payload: z.input<typeof CaseWithClientCreatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

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
        const adminIds = await getActiveUserIdsByRoles({
          roles: notificationRoleConfig[NotificationType.CaseAssigned],
        });
        await dispatchNotifications(
          {
            userIds: adminIds,
            type: NotificationType.CaseAssigned,
            title: `New case: ${caseData.case_title}`,
            message: `A new case "${caseData.case_title}" was created for client "${client.name}"`,
            actionUrl: `/case/${createdWithClient.id}`,
            caseId: createdWithClient.id,
          },
          session.id,
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
  } = parsed.data;

  try {
    const existing = await getCaseEditData(caseId);
    if (!existing) return { success: false, error: "Case not found" };

    await updateCase({
      caseId,
      client_id,
      case_title,
      case_type,
      status,
      parties_involved: parties_involved || undefined,
      source_consultation_id,
    });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "case.updated",
        entityType: "Case",
        entityId: caseId,
        details: `Updated case: "${case_title}"`,
      }).catch(console.error),
    );

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
    await updateCaseWithClient({
      case_id,
      client_id,
      client,
      case: caseData,
    });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "case.updated",
        entityType: "Case",
        entityId: case_id,
        details: `Updated case: "${caseData.case_title}" with client: "${client.name}"`,
      }).catch(console.error),
    );

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
