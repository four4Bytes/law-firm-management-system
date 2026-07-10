"use server";

import {
  getConsultationActivityLogPaginated,
  getConsultationNotesPaginated,
  getConsultationOverviewById,
  getConsultationPaymentsPaginated,
  getConsultationsPaginated,
  type ActivityLogRow,
  type ConsultationOverviewData,
  type ConsultationRow,
  type NoteRow,
  type PaymentRow,
} from "@/features/consultations/queries";
import { getDocumentsPaginated, type DocumentRow } from "@/features/documents/queries";
import { requireAuth } from "@/lib/auth-guards";
import { PageQuerySchema } from "@/lib/schemas";

import { ConsultationOverviewIdSchema, ConsultationPageQuerySchema } from "./schemas";

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
