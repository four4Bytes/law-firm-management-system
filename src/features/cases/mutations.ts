import { prisma } from "@/lib/prisma";

import type {
  CaseCreatePayload,
  CaseUpdatePayload,
  CaseWithClientCreatePayload,
  CaseWithClientUpdatePayload,
} from "./schemas";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function createCase(
  data: CaseCreatePayload & { created_by_user_id: string },
  tx?: TransactionClient,
) {
  const { assignee_ids, ...rest } = data;
  const client = tx || prisma;
  return client.case.create({
    data: {
      ...rest,
      ...(assignee_ids?.length
        ? { caseAssignments: { create: assignee_ids.map((user_id) => ({ user_id })) } }
        : {}),
    },
  });
}

export async function updateCase(data: CaseUpdatePayload, tx?: TransactionClient) {
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
  });
}

export async function deleteCase(id: string) {
  return prisma.case.delete({ where: { id } });
}

export async function createCaseWithClient(
  data: CaseWithClientCreatePayload & { created_by_user_id: string },
) {
  return prisma.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        name: data.client.name,
        email: data.client.email || undefined,
        phone_number: data.client.phone_number || undefined,
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
) {
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
        phone_number: data.client.phone_number ?? null,
        address: data.client.address ?? null,
      },
    });

    return updateCase(
      {
        caseId: data.case_id,
        client_id: data.client_id,
        case_title: data.case.case_title,
        case_type: data.case.case_type,
        status: data.case.status,
        parties_involved: data.case.parties_involved || undefined,
        assignee_ids: data.case.assignee_ids,
      },
      tx,
    );
  });
}
