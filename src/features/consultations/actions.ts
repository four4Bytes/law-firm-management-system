"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
import {
  getConsultationAccessContext,
  getConsultationAssigneeIds,
  getConsultationEditData,
  getConsultationNotesPaginated,
  getConsultationOverviewById,
  getConsultationsPaginated,
  type ConsultationEditData,
  type ConsultationOverviewData,
  type ConsultationRow,
} from "@/features/consultations/queries";
import type { NoteRow } from "@/features/notes/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { diffNewAssigneeIds } from "@/features/notifications/recipients";
import { NotificationType } from "@/generated/prisma/browser";
import type { ActionStatusResponse } from "@/lib/action-response";
import {
  assertRecordPermission,
  requireAuth,
  requirePermissionOrNull,
  type AuthenticatedUser,
} from "@/lib/auth-guards";
import { can, FORBIDDEN_MESSAGE, type AccessContext, type Permission } from "@/lib/rbac";
import { PageQuerySchema } from "@/lib/schemas";

import {
  createConsultation,
  createConsultationWithClient,
  deleteConsultation,
  updateConsultation,
  updateConsultationWithClient,
} from "./mutations";
import {
  ConsultationCreatePayloadSchema,
  ConsultationDeletePayloadSchema,
  ConsultationOverviewIdSchema,
  ConsultationPageQuerySchema,
  ConsultationUpdatePayloadSchema,
  ConsultationWithClientCreatePayloadSchema,
  ConsultationWithClientUpdatePayloadSchema,
} from "./schemas";

async function requireConsultationPermission(
  session: AuthenticatedUser,
  consultationId: string,
  permission: Permission,
): Promise<AccessContext> {
  const access = await getConsultationAccessContext(session.id, consultationId);
  return assertRecordPermission(session, permission, access);
}

async function hasConsultationPermission(
  session: AuthenticatedUser,
  consultationId: string,
  permission: Permission,
): Promise<boolean> {
  const access = await getConsultationAccessContext(session.id, consultationId);
  return can(session.role, permission, access);
}

export async function getConsultationsPaginatedAction(
  params: z.input<typeof PageQuerySchema>,
): Promise<{
  consultations: ConsultationRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = PageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  const assignedUserId = can(session.role, "consultation.read") ? undefined : session.id;
  return getConsultationsPaginated(parsed.data, assignedUserId);
}

export async function getConsultationOverviewByIdAction(
  id: string,
): Promise<{ overview: ConsultationOverviewData; access: AccessContext }> {
  const session = await requireAuth();

  const parsed = ConsultationOverviewIdSchema.safeParse({ consultationId: id });
  if (!parsed.success) {
    throw new Error("Invalid consultation ID");
  }

  const consultationId = parsed.data.consultationId;
  const access = await requireConsultationPermission(session, consultationId, "consultation.read");

  const overview = await getConsultationOverviewById(consultationId);

  return { overview, access };
}

export async function getConsultationNotesPaginatedAction(
  params: z.input<typeof ConsultationPageQuerySchema>,
): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = ConsultationPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  await requireConsultationPermission(session, parsed.data.consultationId, "note.read");

  return getConsultationNotesPaginated(parsed.data);
}

export async function getConsultationForEditAction(
  id: string,
): Promise<ConsultationEditData | null> {
  const session = await requireAuth();

  const parsed = ConsultationOverviewIdSchema.safeParse({ consultationId: id });
  if (!parsed.success) {
    throw new Error("Invalid consultation ID");
  }

  const consultationId = parsed.data.consultationId;
  await requireConsultationPermission(session, consultationId, "consultation.update");

  return getConsultationEditData(consultationId);
}

export async function createConsultationAction(
  payload: z.input<typeof ConsultationCreatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requirePermissionOrNull("consultation.create");
  if (!session) {
    return { success: false, error: FORBIDDEN_MESSAGE };
  }

  const parsed = ConsultationCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation data" };
  }

  const { client_id, concern, booking_datetime, status, reminder_days, assignee_ids } = parsed.data;

  let createdConsultation: { id: string };
  try {
    createdConsultation = await createConsultation({
      client_id,
      concern,
      booking_datetime,
      status,
      created_by_user_id: session.id,
      reminder_days,
      assignee_ids,
    });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "consultation.created",
          entityType: "Consultation",
          entityId: createdConsultation.id,
          details: `Created consultation: "${concern}"`,
        });
      } catch (err) {
        console.error(
          "Failed to log consultation.created audit for Consultation",
          createdConsultation.id,
          err,
        );
      }
    });

    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to create consultation" };
  }
}

export async function createConsultationWithClientAction(
  payload: z.input<typeof ConsultationWithClientCreatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requirePermissionOrNull("consultation.create");
  if (!session) {
    return { success: false, error: FORBIDDEN_MESSAGE };
  }

  const parsed = ConsultationWithClientCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation data" };
  }

  let createdWithClient: { id: string };
  try {
    createdWithClient = await createConsultationWithClient({
      ...parsed.data,
      created_by_user_id: session.id,
    });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "consultation.created",
          entityType: "Consultation",
          entityId: createdWithClient.id,
          details: `Created consultation: "${parsed.data.consultation.concern}" with client: "${parsed.data.client.name}"`,
        });
      } catch (err) {
        console.error(
          "Failed to log consultation.created audit for Consultation",
          createdWithClient.id,
          err,
        );
      }
    });

    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to create consultation" };
  }
}

export async function updateConsultationAction(
  payload: z.input<typeof ConsultationUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation data" };
  }

  const {
    consultationId,
    client_id,
    concern,
    booking_datetime,
    status,
    reminder_days,
    assignee_ids,
  } = parsed.data;

  try {
    const existing = await getConsultationEditData(consultationId);
    if (!existing) return { success: false, error: "Consultation not found" };

    if (!(await hasConsultationPermission(session, consultationId, "consultation.update"))) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    const resetReminderTiming =
      existing.booking_datetime.getTime() !== booking_datetime.getTime() ||
      (reminder_days !== undefined && existing.reminder_days !== reminder_days);

    await updateConsultation({
      consultationId,
      client_id,
      concern,
      booking_datetime,
      status,
      reminder_days,
      assignee_ids,
      resetReminderTiming,
    });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "consultation.updated",
          entityType: "Consultation",
          entityId: consultationId,
          details: `Updated consultation: "${concern}"`,
        });
      } catch (err) {
        console.error(
          "Failed to log consultation.updated audit for Consultation",
          consultationId,
          err,
        );
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
              type: NotificationType.ConsultationAssigned,
              title: `Consultation assigned: ${concern.substring(0, 100)}`,
              message: `You have been assigned to consultation: "${concern.substring(0, 100)}"`,
              actionUrl: `/consultation/${consultationId}`,
              consultationId,
            },
            session.id,
          );
        }
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }

      try {
        if (existing.status !== status) {
          const assigneeIds = await getConsultationAssigneeIds(consultationId);
          if (assigneeIds.length > 0) {
            await dispatchNotifications(
              {
                userIds: assigneeIds,
                type: NotificationType.ConsultationStatusChanged,
                title: `Consultation status changed: ${concern.substring(0, 100)}`,
                message: `Consultation "${concern.substring(0, 100)}" status changed from ${existing.status} to ${status}`,
                actionUrl: `/consultation/${consultationId}`,
                consultationId,
              },
              session.id,
            );
          }
        }
      } catch (err) {
        console.error("Failed to dispatch status change notification:", err);
      }
    });

    revalidatePath(`/consultation/${consultationId}`);
    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update consultation" };
  }
}

export async function updateConsultationWithClientAction(
  payload: z.input<typeof ConsultationWithClientUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationWithClientUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation data" };
  }

  const { consultation_id, client_id, client, consultation } = parsed.data;

  try {
    const existing = await getConsultationEditData(consultation_id);
    if (!existing) return { success: false, error: "Consultation not found" };

    if (!(await hasConsultationPermission(session, consultation_id, "consultation.update"))) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    const resetReminderTiming =
      existing.booking_datetime.getTime() !== consultation.booking_datetime.getTime() ||
      (consultation.reminder_days !== undefined &&
        existing.reminder_days !== consultation.reminder_days);

    await updateConsultationWithClient({
      consultation_id,
      client_id,
      client,
      consultation,
      resetReminderTiming,
    });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "consultation.updated",
          entityType: "Consultation",
          entityId: consultation_id,
          details: `Updated consultation: "${consultation.concern}" with client: "${client.name}"`,
        });
      } catch (err) {
        console.error(
          "Failed to log consultation.updated audit for Consultation",
          consultation_id,
          err,
        );
      }

      try {
        const newAssigneeIds = diffNewAssigneeIds(
          consultation.assignee_ids ?? existing.assignee_ids,
          existing.assignee_ids,
        );

        if (newAssigneeIds.length > 0) {
          await dispatchNotifications(
            {
              userIds: newAssigneeIds,
              type: NotificationType.ConsultationAssigned,
              title: `Consultation assigned: ${consultation.concern.substring(0, 100)}`,
              message: `You have been assigned to consultation: "${consultation.concern.substring(0, 100)}"`,
              actionUrl: `/consultation/${consultation_id}`,
              consultationId: consultation_id,
            },
            session.id,
          );
        }
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }

      try {
        if (existing.status !== consultation.status) {
          const assigneeIds = await getConsultationAssigneeIds(consultation_id);
          if (assigneeIds.length > 0) {
            await dispatchNotifications(
              {
                userIds: assigneeIds,
                type: NotificationType.ConsultationStatusChanged,
                title: `Consultation status changed: ${consultation.concern.substring(0, 100)}`,
                message: `Consultation "${consultation.concern.substring(0, 100)}" status changed from ${existing.status} to ${consultation.status}`,
                actionUrl: `/consultation/${consultation_id}`,
                consultationId: consultation_id,
              },
              session.id,
            );
          }
        }
      } catch (err) {
        console.error("Failed to dispatch status change notification:", err);
      }
    });

    revalidatePath(`/consultation/${consultation_id}`);
    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update consultation" };
  }
}

export async function deleteConsultationAction(
  payload: z.input<typeof ConsultationDeletePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationDeletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation ID" };
  }

  try {
    const existing = await getConsultationEditData(parsed.data.consultationId);
    if (!existing) return { success: false, error: "Consultation not found" };

    if (
      !(await hasConsultationPermission(session, parsed.data.consultationId, "consultation.delete"))
    ) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    await deleteConsultation(parsed.data.consultationId);

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "consultation.deleted",
        entityType: "Consultation",
        entityId: parsed.data.consultationId,
        details: `Deleted consultation: "${existing.concern}"`,
      }).catch(console.error),
    );

    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete consultation" };
  }
}
