import { SubtaskStatus } from "@/generated/prisma/browser";
import { isBeforeToday } from "@/lib/primitives/date";

export function getSubtaskStatusLabel(status: SubtaskStatus): string {
  return status === SubtaskStatus.InProgress ? "In Progress" : status;
}

export function getSubtaskStatusVariant(status: SubtaskStatus): "pending" | "info" | "done" {
  if (status === SubtaskStatus.Pending) return "pending";
  if (status === SubtaskStatus.InProgress) return "info";
  return "done";
}

export interface SubtaskOverduePayload {
  due_date: Date;
  status: SubtaskStatus;
}

export function isSubtaskOverdue(payload: SubtaskOverduePayload): boolean {
  const { due_date, status } = payload;
  return status !== SubtaskStatus.Done && isBeforeToday(due_date);
}
