"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";

import { createTask, deleteTask, updateTask } from "./mutations";
import {
  getActiveUsers,
  getTaskById,
  getTaskDetailRowById,
  type ActiveUserSummary,
  type TaskDetailRow,
} from "./queries";
import { TaskCreatePayloadSchema, TaskIdSchema, TaskUpdatePayloadSchema } from "./schemas";

export async function getActiveUsersAction(): Promise<ActiveUserSummary[]> {
  await requireAuth();
  return getActiveUsers();
}

export async function getTaskDetailRowByIdAction(taskId: string): Promise<TaskDetailRow | null> {
  await requireAuth();

  const parsed = TaskIdSchema.safeParse({ taskId });
  if (!parsed.success) throw new Error("Invalid task ID");

  return getTaskDetailRowById(parsed.data.taskId);
}

export async function createTaskAction(
  payload: z.input<typeof TaskCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = TaskCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "Invalid task data" };

  const { title, description, status, case_id, assignee_ids } = parsed.data;

  try {
    const task = await createTask({
      title,
      description,
      status,
      case_id,
      created_by_user_id: session.id,
      assignee_ids,
    });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "task.created",
        entityType: "Case",
        entityId: case_id,
        details: `Created task: "${title}"`,
      }).catch(console.error),
    );

    revalidatePath(`/case/${case_id}`);

    return { success: true, data: { id: task.id } };
  } catch {
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTaskAction(
  payload: z.input<typeof TaskUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = TaskUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "Invalid task data" };

  const { taskId, title, description, status, assignee_ids } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return { success: false, error: "Task not found" };

    await updateTask(taskId, { title, description, status, assignee_ids });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "task.updated",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Updated task: "${title}"`,
      }).catch(console.error),
    );

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update task" };
  }
}

export async function deleteTaskAction(
  payload: z.input<typeof TaskIdSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = TaskIdSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "Invalid task ID" };

  const { taskId } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return { success: false, error: "Task not found" };

    await deleteTask(taskId);

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "task.deleted",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Deleted task: "${existing.title}"`,
      }).catch(console.error),
    );

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete task" };
  }
}
