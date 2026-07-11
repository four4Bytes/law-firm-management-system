import { type CaseMilestoneStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface MilestoneCreateData {
  title: string;
  description?: string | null;
  due_date: Date;
  status: CaseMilestoneStatus;
  case_id: string;
  created_by_user_id: string;
}

export async function createMilestone(data: MilestoneCreateData): Promise<{ id: string }> {
  return prisma.caseMilestone.create({
    data: {
      title: data.title,
      description: data.description || null,
      due_date: data.due_date,
      status: data.status,
      case_id: data.case_id,
      created_by_user_id: data.created_by_user_id,
    },
    select: { id: true },
  });
}

export async function updateMilestone(
  id: string,
  data: {
    title: string;
    description?: string | null;
    due_date: Date;
    status: CaseMilestoneStatus;
  },
): Promise<{ id: string }> {
  return prisma.caseMilestone.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      due_date: data.due_date,
      status: data.status,
    },
    select: { id: true },
  });
}

export async function deleteMilestone(id: string): Promise<{ id: string }> {
  return prisma.caseMilestone.delete({ where: { id }, select: { id: true } });
}
