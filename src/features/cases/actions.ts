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
  type CaseRow,
  type MilestoneRow,
  type NoteRow,
  type PaymentRow,
} from "@/features/cases/queries";
import { getDocumentsPaginated, type DocumentRow } from "@/features/documents/queries";
import type { TaskRow } from "@/features/tasks/queries";
import { requireAuth } from "@/lib/auth-guards";
import { PageQuerySchema } from "@/lib/schemas";

import { CaseOverviewIdSchema, CasePageQuerySchema } from "./schemas";

export async function getCasesPaginatedAction(params: unknown): Promise<{
  cases: CaseRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = PageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCasesPaginated(parsed.data);
}

export async function getCaseOverviewByIdAction(id: string): Promise<CaseOverviewData> {
  await requireAuth();

  const parsed = CaseOverviewIdSchema.safeParse({ id });
  if (!parsed.success) {
    throw new Error("Invalid case ID");
  }

  return getCaseOverviewById(parsed.data.id);
}

export async function getCaseTasksPaginatedAction(params: unknown): Promise<{
  rows: TaskRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCaseTasksPaginated(parsed.data);
}

export async function getCaseNotesPaginatedAction(params: unknown): Promise<{
  rows: NoteRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCaseNotesPaginated(parsed.data);
}

export async function getCaseDocumentsPaginatedAction(params: unknown): Promise<{
  rows: DocumentRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getDocumentsPaginated(parsed.data);
}

export async function getCaseMilestonesPaginatedAction(params: unknown): Promise<{
  rows: MilestoneRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCaseMilestonesPaginated(parsed.data);
}

export async function getCasePaymentsPaginatedAction(params: unknown): Promise<{
  rows: PaymentRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCasePaymentsPaginated(parsed.data);
}

export async function getCaseActivityLogPaginatedAction(params: unknown): Promise<{
  rows: ActivityLogRow[];
  nextCursor: string | null;
}> {
  await requireAuth();

  const parsed = CasePageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getCaseActivityLogPaginated(parsed.data);
}
