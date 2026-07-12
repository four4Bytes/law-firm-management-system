import { prisma } from "@/lib/prisma";

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
