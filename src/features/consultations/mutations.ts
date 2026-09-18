import { createCase } from "@/features/cases/mutations";
import { getDocumentFilePathsByConsultationId } from "@/features/documents/queries";
import { CaseStatus, ConsultationStatus } from "@/generated/prisma/browser";
import { StatusConflictError } from "@/lib/errors";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import type {
  ConsultationCreatePayload,
  ConsultationUpdatePayload,
  ConsultationWithClientCreatePayload,
  ConsultationWithClientUpdatePayload,
} from "./schemas";

export async function createConsultation(
  data: ConsultationCreatePayload & { created_by_user_id: string },
  tx?: TransactionClient,
): Promise<{ id: string }> {
  const { assignee_ids, ...rest } = data;
  const client = tx || prisma;
  return client.consultation.create({
    data: {
      ...rest,
      ...(assignee_ids?.length
        ? { consultationAssignments: { create: assignee_ids.map((user_id) => ({ user_id })) } }
        : {}),
    },
    select: { id: true },
  });
}

export interface ConsultationUpdateData extends ConsultationUpdatePayload {
  resetReminderTiming?: boolean;
}

export async function updateConsultation(
  data: ConsultationUpdateData,
  tx?: TransactionClient,
): Promise<{ id: string }> {
  const { consultationId, assignee_ids, resetReminderTiming, ...rest } = data;
  const client = tx || prisma;

  return client.consultation.update({
    where: { id: consultationId },
    data: {
      ...rest,
      ...(resetReminderTiming ? { last_reminded_at: null } : {}),
      ...(assignee_ids !== undefined
        ? {
            consultationAssignments: {
              deleteMany: {},
              create: assignee_ids.map((user_id) => ({ user_id })),
            },
          }
        : {}),
    },
    select: { id: true },
  });
}

export async function updateConsultationStatus(
  id: string,
  status: ConsultationStatus,
  expectedStatus?: ConsultationStatus,
  tx?: TransactionClient,
): Promise<{ id: string }> {
  const client = tx || prisma;
  if (!expectedStatus) {
    return client.consultation.update({
      where: { id },
      data: { status },
      select: { id: true },
    });
  }
  const result = await client.consultation.updateMany({
    where: { id, status: expectedStatus },
    data: { status },
  });
  if (result.count !== 1) throw new StatusConflictError();
  return { id };
}

export interface ConsultationDecisionData {
  consultationId: string;
  status: ConsultationStatus;
  reason?: string;
  decidedByUserId: string;
  expectedStatus?: ConsultationStatus;
}

const CONSULTATION_DECISION_NOTE_LABELS: Record<
  Exclude<ConsultationStatus, "Scheduled" | "Completed" | "Accepted">,
  string
> = {
  Rejected: "Rejection reason",
  Cancelled: "Cancellation reason",
};

function consultationDecisionNoteLabel(status: ConsultationStatus): string {
  return (
    CONSULTATION_DECISION_NOTE_LABELS[
      status as Exclude<ConsultationStatus, "Scheduled" | "Completed" | "Accepted">
    ] ?? "Decision reason"
  );
}

export async function transitionConsultationWithNote(
  data: ConsultationDecisionData,
): Promise<{ id: string }> {
  const { consultationId, status, reason, decidedByUserId, expectedStatus } = data;
  return prisma.$transaction(async (tx) => {
    if (expectedStatus) {
      const result = await tx.consultation.updateMany({
        where: { id: consultationId, status: expectedStatus },
        data: { status },
      });
      if (result.count !== 1) throw new StatusConflictError();
    } else {
      await tx.consultation.update({
        where: { id: consultationId },
        data: { status },
        select: { id: true },
      });
    }
    if (reason) {
      const label = consultationDecisionNoteLabel(status);
      await tx.note.create({
        data: {
          content: `${label}: ${reason}`,
          consultation_id: consultationId,
          created_by_user_id: decidedByUserId,
        },
        select: { id: true },
      });
    }
    return { id: consultationId };
  });
}

export interface AcceptConsultationWithCaseData {
  consultationId: string;
  caseTitle: string;
  caseType: string;
  status: CaseStatus;
  partiesInvolved?: string;
  assigneeIds?: string[];
  createdByUserId: string;
  expectedStatus?: ConsultationStatus;
}

export async function acceptConsultationWithCase(
  data: AcceptConsultationWithCaseData,
): Promise<{ caseId: string }> {
  const { consultationId } = data;
  return prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.findUnique({
      where: { id: consultationId },
      select: { id: true, client_id: true, status: true },
    });
    if (!consultation) {
      throw new Error("Consultation not found");
    }
    const linked = await tx.case.findUnique({
      where: { source_consultation_id: consultationId },
      select: { id: true },
    });
    if (linked) {
      throw new Error("A case already exists for this consultation");
    }
    if (
      consultation.status !== ConsultationStatus.Completed &&
      consultation.status !== ConsultationStatus.Accepted
    ) {
      throw new Error("Consultation cannot be accepted");
    }
    if (data.expectedStatus) {
      const accepted = await tx.consultation.updateMany({
        where: { id: consultationId, status: data.expectedStatus },
        data: { status: ConsultationStatus.Accepted },
      });
      if (accepted.count !== 1) throw new StatusConflictError();
    } else {
      await tx.consultation.update({
        where: { id: consultationId },
        data: { status: ConsultationStatus.Accepted },
        select: { id: true },
      });
    }
    const created = await createCase(
      {
        client_id: consultation.client_id,
        case_title: data.caseTitle,
        case_type: data.caseType,
        status: data.status,
        parties_involved: data.partiesInvolved,
        source_consultation_id: consultationId,
        assignee_ids: data.assigneeIds,
        created_by_user_id: data.createdByUserId,
      },
      tx,
    );
    return { caseId: created.id };
  });
}

export async function deleteConsultation(id: string): Promise<{ id: string }> {
  const filePaths = await getDocumentFilePathsByConsultationId(id);
  const deleted = await prisma.consultation.delete({ where: { id }, select: { id: true } });
  await deleteDocumentFiles(filePaths);
  return deleted;
}

export async function createConsultationWithClient(
  data: ConsultationWithClientCreatePayload & { created_by_user_id: string },
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        name: data.client.name,
        email: data.client.email || undefined,
        phone_number: data.client.phone_number,
        address: data.client.address || undefined,
      },
    });

    return createConsultation(
      {
        client_id: newClient.id,
        concern: data.consultation.concern,
        booking_datetime: data.consultation.booking_datetime,
        status: data.consultation.status,
        assignee_ids: data.consultation.assignee_ids,
        created_by_user_id: data.created_by_user_id,
      },
      tx,
    );
  });
}

export interface ConsultationWithClientUpdateData extends ConsultationWithClientUpdatePayload {
  resetReminderTiming?: boolean;
}

export async function updateConsultationWithClient(
  data: ConsultationWithClientUpdateData,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    // Verify that the consultation belongs to the specified client
    const consultation = await tx.consultation.findUnique({
      where: { id: data.consultation_id },
      select: { id: true, client_id: true },
    });

    if (!consultation || consultation.client_id !== data.client_id) {
      throw new Error("Consultation not found or does not belong to the specified client");
    }

    await tx.client.update({
      where: { id: data.client_id },
      data: {
        name: data.client.name,
        email: data.client.email || undefined,
        phone_number: data.client.phone_number,
        address: data.client.address || undefined,
      },
    });

    return updateConsultation(
      {
        consultationId: data.consultation_id,
        client_id: data.client_id,
        concern: data.consultation.concern,
        booking_datetime: data.consultation.booking_datetime,
        assignee_ids: data.consultation.assignee_ids,
        resetReminderTiming: data.resetReminderTiming,
      },
      tx,
    );
  });
}
