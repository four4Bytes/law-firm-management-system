"use server";

import {
  getConsultationActivityLogPaginated,
  getConsultationNotesPaginated,
  getConsultationOverviewById,
  getConsultationPaymentsPaginated,
  getConsultationsPaginated,
  type ActivityLogRow,
  type ConsultationOverviewData,
  type ConsultationPageQuery,
  type ConsultationRow,
  type NoteRow,
  type PaymentRow,
} from "@/features/consultations/queries";
import { getDocumentsPaginated, type DocumentRow } from "@/features/documents/queries";
import type { PageQuery } from "@/lib/types";

export async function getConsultationsPaginatedAction(
  params: PageQuery,
): Promise<{ consultations: ConsultationRow[]; nextCursor: string | null }> {
  return getConsultationsPaginated(params);
}

export async function getConsultationOverviewByIdAction(
  id: string,
): Promise<ConsultationOverviewData> {
  return getConsultationOverviewById(id);
}

export async function getConsultationNotesPaginatedAction(
  params: ConsultationPageQuery,
): Promise<{ rows: NoteRow[]; nextCursor: string | null }> {
  const { consultationId, search, cursor, pageSize } = params;
  return getConsultationNotesPaginated({ consultationId, search, cursor, pageSize });
}

export async function getConsultationDocumentsPaginatedAction(
  params: ConsultationPageQuery,
): Promise<{ rows: DocumentRow[]; nextCursor: string | null }> {
  const { consultationId, search, cursor, pageSize } = params;
  return getDocumentsPaginated({ consultationId, search, cursor, pageSize });
}

export async function getConsultationPaymentsPaginatedAction(
  params: ConsultationPageQuery,
): Promise<{ rows: PaymentRow[]; nextCursor: string | null }> {
  const { consultationId, search, cursor, pageSize, sort } = params;
  return getConsultationPaymentsPaginated({ consultationId, search, cursor, pageSize, sort });
}

export async function getConsultationActivityLogPaginatedAction(
  params: ConsultationPageQuery,
): Promise<{ rows: ActivityLogRow[]; nextCursor: string | null }> {
  const { consultationId, search, cursor, pageSize } = params;
  return getConsultationActivityLogPaginated({ consultationId, search, cursor, pageSize });
}
