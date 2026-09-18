"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import {
  getConsultationAccessContext,
  getConsultationAssigneeIds,
  getConsultationEditData,
  getConsultationNotesPaginated,
  getConsultationOverviewById,
  getConsultationsPaginated,
  hasLinkedCase,
  type ConsultationEditData,
  type ConsultationOverviewData,
  type ConsultationRow,
} from "@/features/consultations/queries";
import type { NoteRow } from "@/features/notes/queries";
import { notifyRecipients } from "@/features/notifications/notify";
import { diffNewAssigneeIds } from "@/features/notifications/recipients";
import { ConsultationStatus, NotificationType } from "@/generated/prisma/browser";
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
import { isAfterToday, isBeforeToday } from "@/lib/date";
import { StatusConflictError, toActionResponse } from "@/lib/errors";
import { can, type AccessContext, type Permission } from "@/lib/rbac";
import { PageQuerySchema } from "@/lib/schemas";

import {
  acceptConsultationWithCase,
  createConsultation,
  createConsultationWithClient,
  deleteConsultation,
  transitionConsultationWithNote,
  updateConsultation,
  updateConsultationStatus,
  updateConsultationWithClient,
} from "./mutations";
import {
  AcceptConsultationWithCasePayloadSchema,
  ConsultationCreatePayloadSchema,
  ConsultationDeletePayloadSchema,
  ConsultationOverviewIdSchema,
  ConsultationPageQuerySchema,
  ConsultationStatusChangePayloadSchema,
  ConsultationUpdatePayloadSchema,
  ConsultationWithClientCreatePayloadSchema,
  ConsultationWithClientUpdatePayloadSchema,
} from "./schemas";
import { describeConsultationNextSteps, isValidConsultationStatusTransition } from "./status";

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

async function isAcceptedWithCase(consultationId: string, status: string): Promise<boolean> {
  return status === ConsultationStatus.Accepted && (await hasLinkedCase(consultationId));
}

const CASE_ALREADY_EXISTS_COPY = {
  title: "Case already exists",
  description:
    "A case already exists for this consultation. Open the linked case from the consultation page instead.",
} as const;

function checkBookingTiming(
  status: ConsultationStatus,
  booking: Date,
): ActionStatusResponse | null {
  if (status === ConsultationStatus.Scheduled && isBeforeToday(booking)) {
    return actionConflict(
      "Booking date is in the past",
      "A scheduled consultation cannot be booked in the past. If the meeting already happened, create it as Completed instead.",
    );
  }
  if (status === ConsultationStatus.Completed && isAfterToday(booking)) {
    return actionConflict(
      "Booking date is in the future",
      "A completed consultation cannot be booked in the future. If the meeting has not happened yet, create it as Scheduled instead.",
    );
  }
  return null;
}

function caseAlreadyExistsConflict(): ActionStatusResponse {
  return actionConflict(CASE_ALREADY_EXISTS_COPY.title, CASE_ALREADY_EXISTS_COPY.description);
}

function mapAcceptMutationError(error: unknown): ActionStatusResponse | null {
  if (error instanceof StatusConflictError) {
    return actionConflict(
      "Record changed",
      "Another user changed this consultation just now. Refresh the page and try again.",
    );
  }
  if (!(error instanceof Error)) return null;
  switch (error.message) {
    case "A case already exists for this consultation":
      return caseAlreadyExistsConflict();
    case "Consultation not found":
      return actionNotFound("Consultation");
    case "Consultation cannot be accepted":
      return actionConflict(
        "Consultation cannot be accepted",
        "Only completed consultations can be accepted. Mark it as completed first.",
      );
    default:
      return null;
  }
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
  try {
    const session = await requirePermission("consultation.create");

    const parsed = ConsultationCreatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("consultation");
    }

    const { client_id, concern, booking_datetime, status, assignee_ids } = parsed.data;

    const timingError = checkBookingTiming(status, booking_datetime);
    if (timingError) return timingError;

    const createdConsultation = await createConsultation({
      client_id,
      concern,
      booking_datetime,
      status,
      created_by_user_id: session.id,
      assignee_ids,
    });

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "consultation.created",
        entityType: "Consultation",
        entityId: createdConsultation.id,
        details: `Created consultation: "${concern}"`,
      });

      const assigneeIds = assignee_ids ?? [];
      if (assigneeIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: assigneeIds,
          type: NotificationType.ConsultationAssigned,
          title: `Consultation assigned: ${concern.substring(0, 100)}`,
          message: `You have been assigned to consultation: "${concern.substring(0, 100)}"`,
          actionUrl: `/consultation/${createdConsultation.id}`,
          consultationId: createdConsultation.id,
        });
      }
    });

    revalidatePath("/consultation");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "create consultation");
  }
}

export async function createConsultationWithClientAction(
  payload: z.input<typeof ConsultationWithClientCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  try {
    const session = await requirePermission("consultation.create");

    const parsed = ConsultationWithClientCreatePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("consultation");
    }

    const timingError = checkBookingTiming(
      parsed.data.consultation.status,
      parsed.data.consultation.booking_datetime,
    );
    if (timingError) return timingError;

    const createdWithClient = await createConsultationWithClient({
      ...parsed.data,
      created_by_user_id: session.id,
    });

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "consultation.created",
        entityType: "Consultation",
        entityId: createdWithClient.id,
        details: `Created consultation: "${parsed.data.consultation.concern}" with client: "${parsed.data.client.name}"`,
      });

      const assigneeIds = parsed.data.consultation.assignee_ids ?? [];
      if (assigneeIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: assigneeIds,
          type: NotificationType.ConsultationAssigned,
          title: `Consultation assigned: ${parsed.data.consultation.concern.substring(0, 100)}`,
          message: `You have been assigned to consultation: "${parsed.data.consultation.concern.substring(0, 100)}"`,
          actionUrl: `/consultation/${createdWithClient.id}`,
          consultationId: createdWithClient.id,
        });
      }
    });

    revalidatePath("/consultation");

    return { success: true, data: { id: createdWithClient.id } };
  } catch (error) {
    return toActionResponse(error, "create consultation");
  }
}

export async function updateConsultationAction(
  payload: z.input<typeof ConsultationUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return actionInvalid("consultation");
  }

  const { consultationId, client_id, concern, booking_datetime, assignee_ids } = parsed.data;

  try {
    const existing = await getConsultationEditData(consultationId);
    if (!existing) return actionNotFound("Consultation");

    if (!(await hasConsultationPermission(session, consultationId, "consultation.update"))) {
      return actionForbidden();
    }

    if (await isAcceptedWithCase(consultationId, existing.status)) {
      return actionConflict(
        "Consultation already accepted",
        "This consultation has been accepted and linked to a case. Update the case instead.",
      );
    }

    const bookingChanged = existing.booking_datetime.getTime() !== booking_datetime.getTime();
    if (bookingChanged && existing.status !== ConsultationStatus.Scheduled) {
      return actionConflict(
        "Booking date is locked",
        `The booking date can only change while a consultation is scheduled. This consultation is ${existing.status}.`,
      );
    }
    if (bookingChanged && isBeforeToday(booking_datetime)) {
      return actionConflict(
        "Booking date is in the past",
        "The booking date cannot be in the past. Choose a future date, or mark the consultation as Completed if the meeting already happened.",
      );
    }

    const resetReminderTiming = bookingChanged;

    await updateConsultation({
      consultationId,
      client_id,
      concern,
      booking_datetime,
      assignee_ids,
      resetReminderTiming,
    });

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "consultation.updated",
        entityType: "Consultation",
        entityId: consultationId,
        details: `Updated consultation: "${concern}"`,
      });

      const newAssigneeIds = diffNewAssigneeIds(
        assignee_ids ?? existing.assignee_ids,
        existing.assignee_ids,
      );

      if (newAssigneeIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: newAssigneeIds,
          type: NotificationType.ConsultationAssigned,
          title: `Consultation assigned: ${concern.substring(0, 100)}`,
          message: `You have been assigned to consultation: "${concern.substring(0, 100)}"`,
          actionUrl: `/consultation/${consultationId}`,
          consultationId,
        });
      }

      if (resetReminderTiming) {
        const assigneeIds = await getConsultationAssigneeIds(consultationId);
        if (assigneeIds.length > 0) {
          await notifyRecipients(
            session.id,
            {
              userIds: assigneeIds,
              type: NotificationType.ConsultationRescheduled,
              title: `Consultation rescheduled: ${concern.substring(0, 100)}`,
              message: `Consultation "${concern.substring(0, 100)}" has been rescheduled.`,
              actionUrl: `/consultation/${consultationId}`,
              consultationId,
            },
            "reschedule",
          );
        }
      }
    });

    revalidatePath(`/consultation/${consultationId}`);
    revalidatePath("/consultation");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update consultation");
  }
}

export async function updateConsultationWithClientAction(
  payload: z.input<typeof ConsultationWithClientUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationWithClientUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return actionInvalid("consultation");
  }

  const { consultation_id, client_id, client, consultation } = parsed.data;

  try {
    const existing = await getConsultationEditData(consultation_id);
    if (!existing) return actionNotFound("Consultation");

    if (!(await hasConsultationPermission(session, consultation_id, "consultation.update"))) {
      return actionForbidden();
    }

    if (await isAcceptedWithCase(consultation_id, existing.status)) {
      return actionConflict(
        "Consultation already accepted",
        "This consultation has been accepted and linked to a case. Update the case instead.",
      );
    }

    const bookingChanged =
      existing.booking_datetime.getTime() !== consultation.booking_datetime.getTime();
    if (bookingChanged && existing.status !== ConsultationStatus.Scheduled) {
      return actionConflict(
        "Booking date is locked",
        `The booking date can only change while a consultation is scheduled. This consultation is ${existing.status}.`,
      );
    }
    if (bookingChanged && isBeforeToday(consultation.booking_datetime)) {
      return actionConflict(
        "Booking date is in the past",
        "The booking date cannot be in the past. Choose a future date, or mark the consultation as Completed if the meeting already happened.",
      );
    }

    const resetReminderTiming = bookingChanged;

    await updateConsultationWithClient({
      consultation_id,
      client_id,
      client,
      consultation,
      resetReminderTiming,
    });

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "consultation.updated",
        entityType: "Consultation",
        entityId: consultation_id,
        details: `Updated consultation: "${consultation.concern}" with client: "${client.name}"`,
      });

      const newAssigneeIds = diffNewAssigneeIds(
        consultation.assignee_ids ?? existing.assignee_ids,
        existing.assignee_ids,
      );

      if (newAssigneeIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: newAssigneeIds,
          type: NotificationType.ConsultationAssigned,
          title: `Consultation assigned: ${consultation.concern.substring(0, 100)}`,
          message: `You have been assigned to consultation: "${consultation.concern.substring(0, 100)}"`,
          actionUrl: `/consultation/${consultation_id}`,
          consultationId: consultation_id,
        });
      }

      if (resetReminderTiming) {
        const assigneeIds = await getConsultationAssigneeIds(consultation_id);
        if (assigneeIds.length > 0) {
          await notifyRecipients(
            session.id,
            {
              userIds: assigneeIds,
              type: NotificationType.ConsultationRescheduled,
              title: `Consultation rescheduled: ${consultation.concern.substring(0, 100)}`,
              message: `Consultation "${consultation.concern.substring(0, 100)}" has been rescheduled.`,
              actionUrl: `/consultation/${consultation_id}`,
              consultationId: consultation_id,
            },
            "reschedule",
          );
        }
      }
    });

    revalidatePath(`/consultation/${consultation_id}`);
    revalidatePath("/consultation");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update consultation");
  }
}

export async function changeConsultationStatusAction(
  payload: z.input<typeof ConsultationStatusChangePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationStatusChangePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return actionInvalid("consultation");
  }

  const { consultationId, status, reason } = parsed.data;

  try {
    const existing = await getConsultationEditData(consultationId);
    if (!existing) return actionNotFound("Consultation");

    // Accepted risk: permission is checked pre-transaction, so a revocation
    // landing mid-flight can permit one audited write. The concurrent-writer
    // race is closed by the expectedStatus guard below; full closure needs
    // serializable isolation or RLS, a project-wide decision.
    if (!(await hasConsultationPermission(session, consultationId, "consultation.update"))) {
      return actionForbidden();
    }

    if (status === ConsultationStatus.Accepted) {
      return actionConflict(
        "Accept from the consultation page",
        "Accepting creates the linked case in the same step. Open the consultation and click the Accept button to continue.",
      );
    }

    if (!isValidConsultationStatusTransition(existing.status as ConsultationStatus, status)) {
      return actionConflict(
        "Invalid status change",
        `Cannot change a consultation from ${existing.status} to ${status}. From ${existing.status}, you can: ${describeConsultationNextSteps(existing.status as ConsultationStatus)}.`,
      );
    }

    const timingError = checkBookingTiming(status, existing.booking_datetime);
    if (timingError) return timingError;

    if (await isAcceptedWithCase(consultationId, existing.status)) {
      return actionConflict(
        "Consultation already accepted",
        "This consultation has been accepted and linked to a case. Update the case instead of changing the consultation status.",
      );
    }

    if (
      reason &&
      (status === ConsultationStatus.Rejected || status === ConsultationStatus.Cancelled)
    ) {
      await transitionConsultationWithNote({
        consultationId,
        status,
        reason,
        decidedByUserId: session.id,
        expectedStatus: existing.status as ConsultationStatus,
      });
    } else {
      await updateConsultationStatus(consultationId, status, existing.status as ConsultationStatus);
    }

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "consultation.status_changed",
        entityType: "Consultation",
        entityId: consultationId,
        details: `Changed consultation status from ${existing.status} to ${status}`,
      });

      const assigneeIds = await getConsultationAssigneeIds(consultationId);
      if (assigneeIds.length > 0) {
        await notifyRecipients(
          session.id,
          {
            userIds: assigneeIds,
            type: NotificationType.ConsultationStatusChanged,
            title: `Consultation status changed: ${existing.concern.substring(0, 100)}`,
            message: `Consultation "${existing.concern.substring(0, 100)}" status changed from ${existing.status} to ${status}.`,
            actionUrl: `/consultation/${consultationId}`,
            consultationId,
          },
          "status change",
        );
      }
    });

    revalidatePath(`/consultation/${consultationId}`);
    revalidatePath("/consultation");

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "change consultation status");
  }
}

export async function deleteConsultationAction(
  payload: z.input<typeof ConsultationDeletePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationDeletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return actionInvalid("consultation");
  }

  try {
    const existing = await getConsultationEditData(parsed.data.consultationId);
    if (!existing) return actionNotFound("Consultation");

    if (
      !(await hasConsultationPermission(session, parsed.data.consultationId, "consultation.delete"))
    ) {
      return actionForbidden();
    }

    await deleteConsultation(parsed.data.consultationId);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "consultation.deleted",
        entityType: "Consultation",
        entityId: parsed.data.consultationId,
        details: `Deleted consultation: "${existing.concern}"`,
      }),
    );

    revalidatePath("/consultation");

    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return actionNotFound("Consultation");
    }
    return toActionResponse(error, "delete consultation");
  }
}

export async function acceptConsultationWithCaseAction(
  payload: z.input<typeof AcceptConsultationWithCasePayloadSchema>,
): Promise<ActionDataResponse<{ caseId: string }>> {
  try {
    const session = await requireAuth();

    const parsed = AcceptConsultationWithCasePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return actionInvalid("case");
    }

    const { consultationId, case_title, case_type, status, parties_involved, assignee_ids } =
      parsed.data;

    const existing = await getConsultationEditData(consultationId);
    if (!existing) return actionNotFound("Consultation");

    await requireConsultationPermission(session, consultationId, "consultation.update");
    await requirePermission("case.create");

    if (await hasLinkedCase(consultationId)) {
      return caseAlreadyExistsConflict();
    }

    if (
      existing.status !== ConsultationStatus.Completed &&
      existing.status !== ConsultationStatus.Accepted
    ) {
      return actionConflict(
        "Consultation cannot be accepted",
        `Only completed consultations can be accepted. This consultation is ${existing.status.toLowerCase()}. Mark it as completed first.`,
      );
    }

    let caseId: string;
    try {
      ({ caseId } = await acceptConsultationWithCase({
        consultationId,
        caseTitle: case_title,
        caseType: case_type,
        status,
        partiesInvolved: parties_involved || undefined,
        assigneeIds: assignee_ids,
        createdByUserId: session.id,
        expectedStatus: existing.status as ConsultationStatus,
      }));
    } catch (error) {
      const mapped = mapAcceptMutationError(error);
      if (mapped) return mapped;
      throw error;
    }

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "consultation.accepted",
        entityType: "Consultation",
        entityId: consultationId,
        details: `Accepted consultation: "${existing.concern}"`,
      });
      await logAudit({
        actorUserId: session.id,
        action: "case.created",
        entityType: "Case",
        entityId: caseId,
        details: `Created case from consultation: "${case_title}"`,
      });

      const assigneeIds = await getConsultationAssigneeIds(consultationId);
      if (assigneeIds.length > 0) {
        await notifyRecipients(
          session.id,
          {
            userIds: assigneeIds,
            type: NotificationType.ConsultationStatusChanged,
            title: `Consultation status changed: ${existing.concern.substring(0, 100)}`,
            message: `Consultation "${existing.concern.substring(0, 100)}" status changed from ${existing.status} to Accepted.`,
            actionUrl: `/consultation/${consultationId}`,
            consultationId,
          },
          "status change",
        );
      }

      const notifyIds = assignee_ids ?? [];
      if (notifyIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: notifyIds,
          type: NotificationType.CaseAssigned,
          title: `Case assigned: ${case_title}`,
          message: `You have been assigned to case: "${case_title.substring(0, 100)}"`,
          actionUrl: `/case/${caseId}`,
          caseId,
        });
      }
    });

    revalidatePath(`/consultation/${consultationId}`);
    revalidatePath("/consultation");
    revalidatePath("/case");

    return { success: true, data: { caseId } };
  } catch (error) {
    return toActionResponse(error, "accept consultation", { ...CASE_ALREADY_EXISTS_COPY });
  }
}
