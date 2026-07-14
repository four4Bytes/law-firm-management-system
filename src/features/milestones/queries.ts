import { cache } from "react";

import type { CaseMilestone } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type MilestoneRow = Pick<
  CaseMilestone,
  "id" | "title" | "description" | "due_date" | "status"
>;

export const getMilestoneById = cache(async (id: string) => {
  return prisma.caseMilestone.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      due_date: true,
      status: true,
      case_id: true,
    },
  });
});

export const getMilestoneRowById = cache(async (id: string): Promise<MilestoneRow | null> => {
  const milestone = await prisma.caseMilestone.findUnique({ where: { id } });
  if (!milestone) return null;

  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    due_date: milestone.due_date,
    status: milestone.status,
  };
});
