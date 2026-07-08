"use server";

import {
  getCaseActivityLogPaginated,
  getCaseMilestonesPaginated,
  getCaseNotesPaginated,
  getCaseOverviewById,
  getCasePaymentsPaginated,
  getCasesPaginated,
  getCaseTasksPaginated,
  type ActivityLogRow,
  type CaseOverviewData,
  type CasePageQuery,
  type CaseRow,
  type MilestoneRow,
  type NoteRow,
  type PaymentRow,
  type TaskRow,
} from "@/features/cases/queries";
import { getDocumentsPaginated, type DocumentRow } from "@/features/documents/queries";
import type { PageQuery } from "@/lib/types";

export async function getCasesPaginatedAction(
  params: PageQuery,
): Promise<{ cases: CaseRow[]; nextCursor: string | null }> {
  return getCasesPaginated(params);
}

export async function getCaseOverviewByIdAction(id: string): Promise<CaseOverviewData> {
  return getCaseOverviewById(id);
}

export async function getCaseTasksPaginatedAction(
  params: CasePageQuery,
): Promise<{ rows: TaskRow[]; nextCursor: string | null }> {
  const { caseId, search, cursor, pageSize, sort } = params;
  return getCaseTasksPaginated({ caseId, search, cursor, pageSize, sort });
}

export async function getCaseNotesPaginatedAction(
  params: CasePageQuery,
): Promise<{ rows: NoteRow[]; nextCursor: string | null }> {
  const { caseId, search, cursor, pageSize } = params;
  return getCaseNotesPaginated({ caseId, search, cursor, pageSize });
}

export async function getCaseDocumentsPaginatedAction(
  params: CasePageQuery,
): Promise<{ rows: DocumentRow[]; nextCursor: string | null }> {
  const { caseId, search, cursor, pageSize } = params;
  return getDocumentsPaginated({ caseId, search, cursor, pageSize });
}

export async function getCaseMilestonesPaginatedAction(
  params: CasePageQuery,
): Promise<{ rows: MilestoneRow[]; nextCursor: string | null }> {
  const { caseId, search, cursor, pageSize, sort } = params;
  return getCaseMilestonesPaginated({ caseId, search, cursor, pageSize, sort });
}

export async function getCasePaymentsPaginatedAction(
  params: CasePageQuery,
): Promise<{ rows: PaymentRow[]; nextCursor: string | null }> {
  const { caseId, search, cursor, pageSize, sort } = params;
  return getCasePaymentsPaginated({ caseId, search, cursor, pageSize, sort });
}

export async function getCaseActivityLogPaginatedAction(
  params: CasePageQuery,
): Promise<{ rows: ActivityLogRow[]; nextCursor: string | null }> {
  const { caseId, search, cursor, pageSize } = params;
  return getCaseActivityLogPaginated({ caseId, search, cursor, pageSize });
}
