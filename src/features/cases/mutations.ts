import { getDocumentFilePathsForCaseDeletion } from "@/features/documents/queries";
import { CaseStatus } from "@/generated/prisma/browser";
import { StatusConflictError } from "@/lib/errors";
import { prisma, type TransactionClient } from "@/lib/prisma";
import { deleteDocumentFiles } from "@/lib/storage-cleanup";

import type {
  CaseCreatePayload,
  CaseUpdatePayload,
  CaseWithClientCreatePayload,
  CaseWithClientUpdatePayload,
} from "./schemas";

export async function createCase(
  data: CaseCreatePayload & { created_by_user_id: string },
  tx?: TransactionClient,
): Promise<{ id: string }> {
  const { assignee_ids, ...rest } = data;
  const client = tx || prisma;
  return client.case.create({
    data: {
      ...rest,
      ...(assignee_ids?.length
        ? { caseAssignments: { create: assignee_ids.map((user_id) => ({ user_id })) } }
        : {}),
    },
    select: { id: true },
  });
}

export async function updateCase(
  data: CaseUpdatePayload,
  tx?: TransactionClient,
): Promise<{ id: string }> {
  const { caseId, assignee_ids, ...rest } = data;
  const client = tx || prisma;

  return client.case.update({
    where: { id: caseId },
    data: {
      ...rest,
      parties_involved: rest.parties_involved ? rest.parties_involved : null,
      ...(assignee_ids !== undefined
        ? {
            caseAssignments: {
              deleteMany: {},
              create: assignee_ids.map((user_id) => ({ user_id })),
            },
          }
        : {}),
    },
    select: { id: true },
  });
}

export interface CaseStatusChange {
  id: string;
  status: CaseStatus;
  expectedStatus?: CaseStatus;
}

export async function updateCaseStatus(
  id: string,
  status: CaseStatus,
  expectedStatus?: CaseStatus,
  tx?: TransactionClient,
): Promise<{ id: string }> {
  const client = tx || prisma;
  if (!expectedStatus) {
    return client.case.update({
      where: { id },
      data: { status },
      select: { id: true },
    });
  }
  const result = await client.case.updateMany({
    where: { id, status: expectedStatus },
    data: { status },
  });
  if (result.count !== 1) throw new StatusConflictError();
  return { id };
}

export interface CaseDecisionData {
  caseId: string;
  status: CaseStatus;
  reason?: string;
  decidedByUserId: string;
  expectedStatus?: CaseStatus;
}

const CASE_DECISION_NOTE_LABELS: Record<Exclude<CaseStatus, "Open">, string> = {
  Closed: "Closing reason",
  Settled: "Settlement reason",
  Terminated: "Termination reason",
};

function caseDecisionNoteLabel(status: CaseStatus): string {
  return CASE_DECISION_NOTE_LABELS[status as Exclude<CaseStatus, "Open">] ?? "Decision reason";
}

export async function transitionCaseWithNote(data: CaseDecisionData): Promise<{ id: string }> {
  const { caseId, status, reason, decidedByUserId, expectedStatus } = data;
  return prisma.$transaction(async (tx) => {
    if (expectedStatus) {
      const result = await tx.case.updateMany({
        where: { id: caseId, status: expectedStatus },
        data: { status },
      });
      if (result.count !== 1) throw new StatusConflictError();
    } else {
      await tx.case.update({
        where: { id: caseId },
        data: { status },
        select: { id: true },
      });
    }
    if (reason) {
      const label = caseDecisionNoteLabel(status);
      await tx.note.create({
        data: {
          content: `${label}: ${reason}`,
          case_id: caseId,
          created_by_user_id: decidedByUserId,
        },
        select: { id: true },
      });
    }
    return { id: caseId };
  });
}

export async function deleteCase(id: string): Promise<{ id: string }> {
  const filePaths = await getDocumentFilePathsForCaseDeletion(id);
  const deleted = await prisma.case.delete({ where: { id }, select: { id: true } });
  await deleteDocumentFiles(filePaths);
  return deleted;
}

export async function createCaseWithClient(
  data: CaseWithClientCreatePayload & { created_by_user_id: string },
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        name: data.client.name,
        email: data.client.email || undefined,
        phone_number: data.client.phone_number,
        address: data.client.address || undefined,
      },
    });

    return createCase(
      {
        client_id: newClient.id,
        case_title: data.case.case_title,
        case_type: data.case.case_type,
        status: data.case.status,
        parties_involved: data.case.parties_involved || undefined,
        assignee_ids: data.case.assignee_ids,
        created_by_user_id: data.created_by_user_id,
      },
      tx,
    );
  });
}

export async function updateCaseWithClient(
  data: CaseWithClientUpdatePayload & { case_id: string; client_id: string },
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const caseRecord = await tx.case.findUnique({
      where: { id: data.case_id },
      select: { id: true, client_id: true },
    });

    if (!caseRecord || caseRecord.client_id !== data.client_id) {
      throw new Error("Case not found or does not belong to the specified client");
    }

    await tx.client.update({
      where: { id: data.client_id },
      data: {
        name: data.client.name,
        email: data.client.email ?? null,
        phone_number: data.client.phone_number,
        address: data.client.address ?? null,
      },
    });

    return updateCase(
      {
        caseId: data.case_id,
        client_id: data.client_id,
        case_title: data.case.case_title,
        case_type: data.case.case_type,
        parties_involved: data.case.parties_involved || undefined,
        assignee_ids: data.case.assignee_ids,
      },
      tx,
    );
  });
}
