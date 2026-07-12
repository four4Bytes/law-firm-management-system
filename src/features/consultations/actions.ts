"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
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

export async function getConsultationsPaginatedAction(
  params: z.input<typeof PageQuerySchema>,
): Promise<{
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

export async function getConsultationNotesPaginatedAction(
  params: z.input<typeof ConsultationPageQuerySchema>,
): Promise<{
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

export async function getConsultationDocumentsPaginatedAction(
  params: z.input<typeof ConsultationPageQuerySchema>,
): Promise<{
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

export async function getConsultationPaymentsPaginatedAction(
  params: z.input<typeof ConsultationPageQuerySchema>,
): Promise<{
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

export async function getConsultationActivityLogPaginatedAction(
  params: z.input<typeof ConsultationPageQuerySchema>,
): Promise<{
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

export async function createConsultationAction(
  payload: z.input<typeof ConsultationCreatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = ConsultationCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid consultation data" };
  }

  const { client_id, concern, booking_datetime, status } = parsed.data;

  let createdConsultation: { id: string };
  try {
    createdConsultation = await createConsultation({
      client_id,
      concern,
      booking_datetime,
      status,
      created_by_user_id: session.id,
    });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "consultation.created",
        entityType: "Consultation",
        entityId: createdConsultation.id,
        details: `Created consultation: "${concern}"`,
      }).catch(console.error),
    );

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

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "consultation.created",
        entityType: "Consultation",
        entityId: createdWithClient.id,
        details: `Created consultation: "${parsed.data.consultation.concern}" with client: "${parsed.data.client.name}"`,
      }).catch(console.error),
    );

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

  const { consultationId, client_id, concern, booking_datetime, status } = parsed.data;

  try {
    const existing = await getConsultationEditData(consultationId);
    if (!existing) return { success: false, error: "Consultation not found" };

    await updateConsultation({ consultationId, client_id, concern, booking_datetime, status });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "consultation.updated",
        entityType: "Consultation",
        entityId: consultationId,
        details: `Updated consultation: "${existing.concern}"`,
      }).catch(console.error),
    );

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
    await updateConsultationWithClient({
      consultation_id,
      client_id,
      client,
      consultation,
    });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "consultation.updated",
        entityType: "Consultation",
        entityId: consultation_id,
        details: `Updated consultation: "${consultation.concern}" with client: "${client.name}"`,
      }).catch(console.error),
    );

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
