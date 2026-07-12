import { prisma } from "@/lib/prisma";

import type { CaseCreatePayload, CaseUpdatePayload } from "./schemas";

export async function createCase(data: CaseCreatePayload & { created_by_user_id: string }) {
  return prisma.case.create({ data });
}

export async function updateCase(data: CaseUpdatePayload) {
  const { id, ...rest } = data;

  return prisma.case.update({
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
