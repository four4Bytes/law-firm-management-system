import { prisma } from "@/lib/prisma";

import type {
  ConsultationCreatePayload,
  ConsultationUpdatePayload,
  ConsultationWithClientCreatePayload,
  ConsultationWithClientUpdatePayload,
} from "./schemas";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function createConsultation(
  data: ConsultationCreatePayload & { created_by_user_id: string },
  tx?: TransactionClient,
) {
  const client = tx || prisma;
  return client.consultation.create({ data });
}

export async function updateConsultation(data: ConsultationUpdatePayload, tx?: TransactionClient) {
  const { consultationId, ...rest } = data;
  const client = tx || prisma;

  return client.consultation.update({
    where: { id: consultationId },
    data: rest,
  });
}

export async function deleteConsultation(id: string) {
  return prisma.consultation.delete({ where: { id } });
}

export async function createConsultationWithClient(
  data: ConsultationWithClientCreatePayload & { created_by_user_id: string },
) {
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
        created_by_user_id: data.created_by_user_id,
      },
      tx,
    );
  });
}

export async function updateConsultationWithClient(
  data: ConsultationWithClientUpdatePayload & { consultation_id: string; client_id: string },
) {
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
      },
      tx,
    );
  });
}
