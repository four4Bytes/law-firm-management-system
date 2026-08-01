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
import { getDocumentsPaginated, type DocumentRow } from "@/features/documents/queries";
import type { NoteRow } from "@/features/notes/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import {
  diffNewAssigneeIds,
  getRoleRecipientIds,
  resolveAssignmentRecipients,
} from "@/features/notifications/recipients";
import { NotificationType } from "@/generated/prisma/browser";
import type { ActionStatusResponse } from "@/lib/action-response";
import { requireAuth, requirePermission } from "@/lib/auth-guards";
import { can, FORBIDDEN_MESSAGE, type AccessContext } from "@/lib/rbac";
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
  const access = await getConsultationAccessContext({ userId: session.id, consultationId });
  if (!can(session.role, "consultation.read", access)) {
    throw new Error("Forbidden");
  }

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

  const access = await getConsultationAccessContext({
    userId: session.id,
    consultationId: parsed.data.consultationId,
  });
  if (!can(session.role, "note.read", access)) {
    throw new Error("Forbidden");
  }

  return getConsultationNotesPaginated(parsed.data);
}

export async function getConsultationDocumentsPaginatedAction(
  params: z.input<typeof ConsultationPageQuerySchema>,
): Promise<{
  rows: DocumentRow[];
  nextCursor: string | null;
}> {
  const session = await requireAuth();

  const parsed = ConsultationPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  const access = await getConsultationAccessContext({
    userId: session.id,
    consultationId: parsed.data.consultationId,
  });
  if (!can(session.role, "attachment.read", access)) {
    throw new Error("Forbidden");
  }

  return getDocumentsPaginated(parsed.data);
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
  const access = await getConsultationAccessContext({ userId: session.id, consultationId });
  if (!can(session.role, "consultation.update", access)) {
    throw new Error("Forbidden");
  }

  return getConsultationEditData(consultationId);
}

export async function createConsultationAction(
  payload: z.input<typeof ConsultationCreatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requirePermission("consultation.create");

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

      try {
        const adminIds = await getRoleRecipientIds(NotificationType.ConsultationCreated);
        await dispatchNotifications(
          {
            userIds: adminIds,
            type: NotificationType.ConsultationCreated,
            title: "New consultation booked",
            message: `A consultation was scheduled for ${concern.substring(0, 100)}`,
            actionUrl: `/consultation/${createdConsultation.id}`,
            consultationId: createdConsultation.id,
          },
          session.id,
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }

      try {
        const notifyIds = await resolveAssignmentRecipients({
          directUserIds: assignee_ids,
          entityId: createdConsultation.id,
          getExistingDirectUserIds: getConsultationAssigneeIds,
        });

        await dispatchNotifications(
          {
            userIds: notifyIds,
            type: NotificationType.ConsultationAssigned,
            title: "New consultation assigned",
            message: `You have been assigned to consultation "${concern.substring(0, 100)}"`,
            actionUrl: `/consultation/${createdConsultation.id}`,
            consultationId: createdConsultation.id,
          },
          session.id,
          notifyIds.includes(session.id),
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
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
  const session = await requireAuth();

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

      try {
        const adminIds = await getRoleRecipientIds(NotificationType.ConsultationCreated);
        await dispatchNotifications(
          {
            userIds: adminIds,
            type: NotificationType.ConsultationCreated,
            title: "New consultation booked",
            message: `A consultation was scheduled for ${parsed.data.consultation.concern.substring(0, 100)}`,
            actionUrl: `/consultation/${createdWithClient.id}`,
            consultationId: createdWithClient.id,
          },
          session.id,
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }

      try {
        const notifyIds = await resolveAssignmentRecipients({
          directUserIds: parsed.data.consultation.assignee_ids,
          entityId: createdWithClient.id,
          getExistingDirectUserIds: getConsultationAssigneeIds,
        });

        await dispatchNotifications(
          {
            userIds: notifyIds,
            type: NotificationType.ConsultationAssigned,
            title: "New consultation assigned",
            message: `You have been assigned to consultation "${parsed.data.consultation.concern.substring(0, 100)}"`,
            actionUrl: `/consultation/${createdWithClient.id}`,
            consultationId: createdWithClient.id,
          },
          session.id,
          notifyIds.includes(session.id),
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
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

    const access = await getConsultationAccessContext({ userId: session.id, consultationId });
    if (!can(session.role, "consultation.update", access)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    await updateConsultation({
      consultationId,
      client_id,
      concern,
      booking_datetime,
      status,
      reminder_days,
      assignee_ids,
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
        const adminIds = await getRoleRecipientIds(NotificationType.ConsultationUpdated);
        await dispatchNotifications(
          {
            userIds: adminIds,
            type: NotificationType.ConsultationUpdated,
            title: "Consultation updated",
            message: `Consultation was updated: "${concern.substring(0, 100)}"`,
            actionUrl: `/consultation/${consultationId}`,
            consultationId,
          },
          session.id,
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }

      try {
        const notifyIds = await resolveAssignmentRecipients({
          directUserIds: diffNewAssigneeIds(assignee_ids, existing.assignee_ids),
          entityId: consultationId,
          getExistingDirectUserIds: getConsultationAssigneeIds,
        });

        await dispatchNotifications(
          {
            userIds: notifyIds,
            type: NotificationType.ConsultationAssigned,
            title: "Consultation assigned",
            message: `You have been assigned to consultation "${concern.substring(0, 100)}"`,
            actionUrl: `/consultation/${consultationId}`,
            consultationId,
          },
          session.id,
          notifyIds.includes(session.id),
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
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

    const access = await getConsultationAccessContext({
      userId: session.id,
      consultationId: consultation_id,
    });
    if (!can(session.role, "consultation.update", access)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    const existingAssigneeIds = await getConsultationAssigneeIds(consultation_id);

    await updateConsultationWithClient({
      consultation_id,
      client_id,
      client,
      consultation,
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
        const adminIds = await getRoleRecipientIds(NotificationType.ConsultationUpdated);
        await dispatchNotifications(
          {
            userIds: adminIds,
            type: NotificationType.ConsultationUpdated,
            title: "Consultation updated",
            message: `Consultation was updated: "${consultation.concern.substring(0, 100)}"`,
            actionUrl: `/consultation/${consultation_id}`,
            consultationId: consultation_id,
          },
          session.id,
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }

      try {
        const notifyIds = await resolveAssignmentRecipients({
          directUserIds: diffNewAssigneeIds(consultation.assignee_ids, existingAssigneeIds),
          entityId: consultation_id,
          getExistingDirectUserIds: getConsultationAssigneeIds,
        });

        await dispatchNotifications(
          {
            userIds: notifyIds,
            type: NotificationType.ConsultationAssigned,
            title: "Consultation assigned",
            message: `You have been assigned to consultation "${consultation.concern.substring(0, 100)}"`,
            actionUrl: `/consultation/${consultation_id}`,
            consultationId: consultation_id,
          },
          session.id,
          notifyIds.includes(session.id),
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
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

    const access = await getConsultationAccessContext({
      userId: session.id,
      consultationId: parsed.data.consultationId,
    });
    if (!can(session.role, "consultation.delete", access)) {
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
