import { type CaseMilestoneStatus } from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";
import { StatusConflictError } from "@/lib/security/errors";

export interface MilestoneCreateData {
  title: string;
  description?: string | null;
  due_date: Date;
  status: CaseMilestoneStatus;
  case_id: string;
  created_by_user_id: string;
}

export interface MilestoneUpdateData {
  title: string;
  description?: string | null;
  due_date: Date;
  status: CaseMilestoneStatus;
  resetReminderTiming?: boolean;
  expectedStatus?: CaseMilestoneStatus;
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
  data: MilestoneUpdateData,
): Promise<{ id: string }> {
  const { expectedStatus, ...fields } = data;
  const shared = {
    title: fields.title,
    description: fields.description || null,
    due_date: fields.due_date,
    status: fields.status,
    ...(fields.resetReminderTiming ? { last_reminded_at: null } : {}),
  };

  if (!expectedStatus) {
    return prisma.caseMilestone.update({
      where: { id },
      data: shared,
      select: { id: true },
    });
  }

  // Conditional update so a status another user changed first is not clobbered.
  // `update` with a compound where would also work but throws P2025 on a status
  // miss, which reads as "not found" instead of "record changed".
  const result = await prisma.caseMilestone.updateMany({
    where: { id, status: expectedStatus },
    data: shared,
  });
  if (result.count !== 1) throw new StatusConflictError();
  return { id };
}

export async function deleteMilestone(id: string): Promise<{ id: string }> {
  return prisma.caseMilestone.delete({ where: { id }, select: { id: true } });
}
