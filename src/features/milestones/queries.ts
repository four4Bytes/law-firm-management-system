import { cache } from "react";

import type { CaseMilestone } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AccessContext } from "@/lib/rbac";

export type MilestoneRow = Pick<
  CaseMilestone,
  "id" | "title" | "description" | "due_date" | "status"
>;

export interface MilestoneAccessPayload {
  userId: string;
  milestoneId: string;
}

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
      reminder_days: true,
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

// ----- Access context -----

export const getMilestoneAccessContext = cache(
  async ({ userId, milestoneId }: MilestoneAccessPayload): Promise<AccessContext> => {
    const milestone = await prisma.caseMilestone.findUnique({
      where: { id: milestoneId },
      select: {
        created_by_user_id: true,
        case: {
          select: {
            caseAssignments: {
              where: { user_id: userId },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!milestone) {
      return { assigned: false, own: false };
    }

    return {
      assigned: milestone.case.caseAssignments.length > 0,
      own: milestone.created_by_user_id === userId,
    };
  },
);
