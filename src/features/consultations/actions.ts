"use server";

import { revalidatePath } from "next/cache";

import {
  getConsultationActivityLogPaginated,
  getConsultationEditData,
  getConsultationNotesPaginated,
  getConsultationOverviewById,
  getConsultationPaymentsPaginated,
  getConsultationsPaginated,
  type ActivityLogRow,
  type ConsultationEditData,
  type ConsultationOverviewData,
  type ConsultationRow,
  type NoteRow,
  type PaymentRow,
} from "@/features/consultations/queries";
import { getDocumentsPaginated, type DocumentRow } from "@/features/documents/queries";
import type { ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { PageQuerySchema } from "@/lib/schemas";

import { createConsultation, deleteConsultation, updateConsultation } from "./mutations";
import {
  ConsultationCreatePayloadSchema,
  ConsultationDeletePayloadSchema,
  ConsultationOverviewIdSchema,
  ConsultationPageQuerySchema,
  ConsultationUpdatePayloadSchema,
  ConsultationWithClientCreatePayloadSchema,
  ConsultationWithClientUpdatePayloadSchema,
} from "./schemas";
import { prisma } from "@/lib/prisma";

export async function getConsultationsPaginatedAction(params: unknown): Promise<{
  consultations: ConsultationRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = PageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getConsultationsPaginated(parsed.data);
}

export async function getConsultationOverviewByIdAction(
  id: string,
): Promise<ConsultationOverviewData> {
  await requireAuth();

  const parsed = ConsultationOverviewIdSchema.safeParse({ id });
  if (!parsed.success) {
    throw new Error("Invalid consultation ID");
  }

  return getConsultationOverviewById(parsed.data.id);
}

export async function getConsultationNotesPaginatedAction(params: unknown): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = ConsultationPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getConsultationNotesPaginated(parsed.data);
}

export async function getConsultationDocumentsPaginatedAction(params: unknown): Promise<{
  rows: DocumentRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = ConsultationPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getDocumentsPaginated(parsed.data);
}

export async function getConsultationPaymentsPaginatedAction(params: unknown): Promise<{
  rows: PaymentRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = ConsultationPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getConsultationPaymentsPaginated(parsed.data);
}

export async function getConsultationActivityLogPaginatedAction(params: unknown): Promise<{
  rows: ActivityLogRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = ConsultationPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getConsultationActivityLogPaginated(parsed.data);
}

export async function getConsultationForEditAction(
  id: string,
): Promise<ConsultationEditData | null> {
  await requireAuth();

  const parsed = ConsultationOverviewIdSchema.safeParse({ id });
  if (!parsed.success) {
    throw new Error("Invalid consultation ID");
  }

  return getConsultationEditData(parsed.data.id);
}

export async function createConsultationAction(payload: unknown): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation data" };
  }

  const { client_id, concern, booking_datetime, status } = parsed.data;

  try {
    await createConsultation({
      client_id,
      concern,
      booking_datetime,
      status,
      created_by_user_id: session.id,
    });

    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to create consultation" };
  }
}

export async function createConsultationWithClientAction(
  payload: unknown,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationWithClientCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation data" };
  }

  const { client, consultation } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const newClient = await tx.client.create({
        data: {
          name: client.name,
          email: client.email || undefined,
          phone_number: client.phone_number || undefined,
          address: client.address || undefined,
        },
      });

      await tx.consultation.create({
        data: {
          client_id: newClient.id,
          concern: consultation.concern,
          booking_datetime: consultation.booking_datetime,
          status: consultation.status,
          created_by_user_id: session.id,
        },
      });
    });

    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to create consultation" };
  }
}

export async function updateConsultationAction(payload: unknown): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = ConsultationUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation data" };
  }

  const { id, client_id, concern, booking_datetime, status } = parsed.data;

  try {
    const existing = await getConsultationEditData(id);
    if (!existing) return { success: false, error: "Consultation not found" };

    await updateConsultation({ id, client_id, concern, booking_datetime, status });

    revalidatePath(`/consultation/${id}`);
    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update consultation" };
  }
}

export async function updateConsultationWithClientAction(
  payload: unknown,
): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = ConsultationWithClientUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation data" };
  }

  const { consultation_id, client_id, client, consultation } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id: client_id },
        data: {
          name: client.name,
          email: client.email || undefined,
          phone_number: client.phone_number || undefined,
          address: client.address || undefined,
        },
      });

      await tx.consultation.update({
        where: { id: consultation_id },
        data: {
          concern: consultation.concern,
          booking_datetime: consultation.booking_datetime,
          status: consultation.status,
        },
      });
    });

    revalidatePath(`/consultation/${consultation_id}`);
    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update consultation" };
  }
}

export async function deleteConsultationAction(payload: unknown): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = ConsultationDeletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation ID" };
  }

  try {
    const existing = await getConsultationEditData(parsed.data.id);
    if (!existing) return { success: false, error: "Consultation not found" };

    await deleteConsultation(parsed.data.id);

    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete consultation" };
  }
}
