import { prisma } from "@/lib/prisma";
import { CaseStatus } from "@/generated/prisma/browser";

import type { CaseCreatePayload, CaseUpdatePayload } from "./schemas";

type TransactionClient = Omit<
  typeof prisma,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export async function createCase(
  data: CaseCreatePayload & { created_by_user_id: string },
  tx?: TransactionClient,
) {
  const client = tx || prisma;
  return client.case.create({ data });
}

export async function updateCase(data: CaseUpdatePayload, tx?: TransactionClient) {
  const { id, ...rest } = data;
  const client = tx || prisma;

  return client.case.update({
    where: { id },
    data: {
      ...rest,
      parties_involved: rest.parties_involved ? rest.parties_involved : null,
    },
  });
}

export async function deleteCase(id: string) {
  return prisma.case.delete({ where: { id } });
}

export async function createCaseWithClient(payload: {
  client: {
    name: string;
    email?: string;
    phone_number?: string;
    address?: string;
  };
  case: {
    case_title: string;
    case_type: string;
    status: CaseStatus;
    parties_involved?: string;
  };
  created_by_user_id: string;
}) {
  return prisma.$transaction(async (tx) => {
    const newClient = await tx.client.create({
      data: {
        name: payload.client.name,
        email: payload.client.email || undefined,
        phone_number: payload.client.phone_number || undefined,
        address: payload.client.address || undefined,
      },
    });

    return tx.case.create({
      data: {
        client_id: newClient.id,
        case_title: payload.case.case_title,
        case_type: payload.case.case_type,
        status: payload.case.status,
        parties_involved: payload.case.parties_involved || undefined,
        created_by_user_id: payload.created_by_user_id,
      },
    });
  });
}

export async function updateCaseWithClient(payload: {
  case_id: string;
  client_id: string;
  client: {
    name: string;
    email?: string;
    phone_number?: string;
    address?: string;
  };
  case: {
    case_title: string;
    case_type: string;
    status: CaseStatus;
    parties_involved?: string;
  };
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.case.findUnique({
      where: { id: payload.case_id },
      select: { id: true, client_id: true },
    });

    if (!existing || existing.client_id !== payload.client_id) {
      throw new Error("Case not found or does not belong to the specified client");
    }

    await tx.client.update({
      where: { id: payload.client_id },
      data: {
        name: payload.client.name,
        email: payload.client.email || undefined,
        phone_number: payload.client.phone_number || undefined,
        address: payload.client.address || undefined,
      },
    });

    return tx.case.update({
      where: { id: payload.case_id },
      data: {
        client_id: payload.client_id,
        case_title: payload.case.case_title,
        case_type: payload.case.case_type,
        status: payload.case.status,
        parties_involved: payload.case.parties_involved || null,
      },
    });
  });
}
