"use server";

import { revalidatePath } from "next/cache";

import {
  getCaseActivityLogPaginated,
  getCaseEditData,
  getCaseMilestonesPaginated,
  getCaseNotesPaginated,
  getCaseOverviewById,
  getCasePaymentsPaginated,
  getCasesPaginated,
  getCaseTasksPaginated,
  type ActivityLogRow,
  type CaseEditData,
  type CaseOverviewData,
  type CaseRow,
  type MilestoneRow,
  type NoteRow,
  type PaymentRow,
} from "@/features/cases/queries";
import { getDocumentsPaginated, type DocumentRow } from "@/features/documents/queries";
import type { TaskRow } from "@/features/tasks/queries";
import type { ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { PageQuerySchema } from "@/lib/schemas";

import { createCase, deleteCase, updateCase } from "./mutations";
import {
  CaseCreatePayloadSchema,
  CaseDeletePayloadSchema,
  CaseOverviewIdSchema,
  CasePageQuerySchema,
  CaseUpdatePayloadSchema,
  CaseWithClientCreatePayloadSchema,
  CaseWithClientUpdatePayloadSchema,
} from "./schemas";
import { prisma } from "@/lib/prisma";

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

export async function getCaseForEditAction(id: string): Promise<CaseEditData | null> {
  await requireAuth();

  const parsed = CaseOverviewIdSchema.safeParse({ id });
  if (!parsed.success) {
    throw new Error("Invalid case ID");
  }

  return getCaseEditData(parsed.data.id);
}

export async function createCaseAction(payload: unknown): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case data" };
  }

  const { client_id, case_title, case_type, status, parties_involved, source_consultation_id } =
    parsed.data;

  try {
    await createCase({
      client_id,
      case_title,
      case_type,
      status,
      parties_involved: parties_involved || undefined,
      source_consultation_id,
      created_by_user_id: session.id,
    });

    revalidatePath("/case");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to create case" };
  }
}

export async function createCaseWithClientAction(
  payload: unknown,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = CaseWithClientCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case data" };
  }

  const { client, case: caseData } = parsed.data;

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

      await tx.case.create({
        data: {
          client_id: newClient.id,
          case_title: caseData.case_title,
          case_type: caseData.case_type,
          status: caseData.status,
          parties_involved: caseData.parties_involved || undefined,
          created_by_user_id: session.id,
        },
      });
    });

    revalidatePath("/case");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to create case" };
  }
}

export async function updateCaseAction(payload: unknown): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = CaseUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case data" };
  }

  const { id, client_id, case_title, case_type, status, parties_involved, source_consultation_id } =
    parsed.data;

  try {
    const existing = await getCaseEditData(id);
    if (!existing) return { success: false, error: "Case not found" };

    await updateCase({
      id,
      client_id,
      case_title,
      case_type,
      status,
      parties_involved: parties_involved || undefined,
      source_consultation_id,
    });

    revalidatePath(`/case/${id}`);
    revalidatePath("/case");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update case" };
  }
}

export async function updateCaseWithClientAction(
  payload: unknown,
): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = CaseWithClientUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case data" };
  }

  const { case_id, client_id, client, case: caseData } = parsed.data;

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

      await tx.case.update({
        where: { id: case_id },
        data: {
          case_title: caseData.case_title,
          case_type: caseData.case_type,
          status: caseData.status,
          parties_involved: caseData.parties_involved || undefined,
        },
      });
    });

    revalidatePath(`/case/${case_id}`);
    revalidatePath("/case");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update case" };
  }
}

export async function deleteCaseAction(payload: unknown): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = CaseDeletePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid case ID" };
  }

  try {
    const existing = await getCaseEditData(parsed.data.id);
    if (!existing) return { success: false, error: "Case not found" };

    await deleteCase(parsed.data.id);

    revalidatePath("/case");

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete case" };
  }
}
