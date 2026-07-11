import { prisma } from "@/lib/prisma";

export type MilestoneRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: Date;
  status: string;
};

export async function getMilestoneById(id: string) {
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
}

export async function getMilestoneRowById(id: string): Promise<MilestoneRow | null> {
  const milestone = await prisma.caseMilestone.findUnique({ where: { id } });
  if (!milestone) return null;

  return {
    id: milestone.id,
    title: milestone.title,
    description: milestone.description,
    due_date: milestone.due_date,
    status: milestone.status,
  };
}
