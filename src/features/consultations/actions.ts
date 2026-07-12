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

  const parsed = ConsultationOverviewIdSchema.safeParse({ consultationId: id });
  if (!parsed.success) {
    throw new Error("Invalid consultation ID");
  }

  return getConsultationOverviewById(parsed.data.consultationId);
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

  const parsed = ConsultationOverviewIdSchema.safeParse({ consultationId: id });
  if (!parsed.success) {
    throw new Error("Invalid consultation ID");
  }

  return getConsultationEditData(parsed.data.consultationId);
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

  try {
    await createConsultationWithClient({
      ...parsed.data,
      created_by_user_id: session.id,
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

  const { consultationId, client_id, concern, booking_datetime, status } = parsed.data;

  try {
    const existing = await getConsultationEditData(consultationId);
    if (!existing) return { success: false, error: "Consultation not found" };

    await updateConsultation({ consultationId, client_id, concern, booking_datetime, status });

    revalidatePath(`/consultation/${consultationId}`);
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

  const { consultation_id, client_id } = parsed.data;

  try {
    await updateConsultationWithClient({
      ...parsed.data,
      consultation_id,
      client_id,
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
    const existing = await getConsultationEditData(parsed.data.consultationId);
    if (!existing) return { success: false, error: "Consultation not found" };

    await deleteConsultation(parsed.data.consultationId);

    revalidatePath("/consultation");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete consultation" };
  }
}
