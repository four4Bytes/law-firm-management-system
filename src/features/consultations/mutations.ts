import { prisma } from "@/lib/prisma";

import type { ConsultationCreatePayload, ConsultationUpdatePayload } from "./schemas";

export async function createConsultation(
  data: ConsultationCreatePayload & { created_by_user_id: string },
) {
  return prisma.consultation.create({ data });
}

export async function updateConsultation(data: ConsultationUpdatePayload) {
  const { id, ...rest } = data;

  return prisma.consultation.update({
    where: { id },
    data: rest,
  });
}

export async function deleteConsultation(id: string) {
  return prisma.consultation.delete({ where: { id } });
}
