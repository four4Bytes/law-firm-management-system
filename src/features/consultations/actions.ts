"use server";

import {
  getConsultationActivityLogPaginated,
  getConsultationDocumentsPaginated,
  getConsultationNotesPaginated,
  getConsultationOverviewById,
  getConsultationPaymentsPaginated,
  getConsultationsPaginated,
} from "@/features/consultations/queries";

export async function getConsultationsPaginatedAction({
  search,
  cursor,
  pageSize,
}: {
  search?: string;
  cursor?: string;
  pageSize?: number;
}) {
  return getConsultationsPaginated({ search, cursor, pageSize });
}

export async function getConsultationOverviewByIdAction(id: string) {
  return getConsultationOverviewById(id);
}

export async function getConsultationNotesPaginatedAction({
  consultationId,
  search,
  cursor,
  pageSize,
}: {
  consultationId: string;
  search?: string;
  cursor?: string;
  pageSize?: number;
}) {
  return getConsultationNotesPaginated({ consultationId, search, cursor, pageSize });
}

export async function getConsultationDocumentsPaginatedAction({
  consultationId,
  search,
  cursor,
  pageSize,
}: {
  consultationId: string;
  search?: string;
  cursor?: string;
  pageSize?: number;
}) {
  return getConsultationDocumentsPaginated({ consultationId, search, cursor, pageSize });
}

export async function getConsultationPaymentsPaginatedAction({
  consultationId,
  search,
  cursor,
  pageSize,
}: {
  consultationId: string;
  search?: string;
  cursor?: string;
  pageSize?: number;
}) {
  return getConsultationPaymentsPaginated({ consultationId, search, cursor, pageSize });
}

export async function getConsultationActivityLogPaginatedAction({
  consultationId,
  search,
  cursor,
  pageSize,
}: {
  consultationId: string;
  search?: string;
  cursor?: string;
  pageSize?: number;
}) {
  return getConsultationActivityLogPaginated({ consultationId, search, cursor, pageSize });
}
