import { prisma, type TransactionClient } from "@/lib/prisma";

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

export async function updateConsultation(
  data: ConsultationUpdatePayload,
  tx?: TransactionClient,
): Promise<{ id: string }> {
  const { consultationId, assignee_ids, ...rest } = data;
  const client = tx || prisma;

  return client.consultation.update({
    where: { id: consultationId },
    data: {
      ...rest,
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

export async function deleteConsultation(id: string): Promise<{ id: string }> {
  return prisma.consultation.delete({ where: { id }, select: { id: true } });
}

export async function createConsultationWithClient(
  data: ConsultationWithClientCreatePayload & { created_by_user_id: string },
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        name: data.client.name,
        email: data.client.email || undefined,
        phone_number: data.client.phone_number || undefined,
        address: data.client.address || undefined,
      },
    });

    return createConsultation(
      {
        client_id: newClient.id,
        concern: data.consultation.concern,
        booking_datetime: data.consultation.booking_datetime,
        status: data.consultation.status,
        reminder_days: data.consultation.reminder_days,
        assignee_ids: data.consultation.assignee_ids,
        created_by_user_id: data.created_by_user_id,
      },
      tx,
    );
  });
}

export async function updateConsultationWithClient(
  data: ConsultationWithClientUpdatePayload & { consultation_id: string; client_id: string },
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
        phone_number: data.client.phone_number || undefined,
        address: data.client.address || undefined,
      },
    });

    return updateConsultation(
      {
        consultationId: data.consultation_id,
        client_id: data.client_id,
        concern: data.consultation.concern,
        booking_datetime: data.consultation.booking_datetime,
        status: data.consultation.status,
        reminder_days: data.consultation.reminder_days,
        assignee_ids: data.consultation.assignee_ids,
      },
      tx,
    );
  });
}
