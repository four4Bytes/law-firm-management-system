"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { SubtaskStatus, TaskStatus } from "@/generated/prisma/browser";
import {
  actionConflict,
  actionForbidden,
  actionInvalid,
  actionNotFound,
  type ActionDataResponse,
  type ActionStatusResponse,
} from "@/lib/security/action-response";
import { assertRecordPermission, requireAuth } from "@/lib/security/auth-guards";
import { toActionResponse } from "@/lib/security/errors";
import { can } from "@/lib/security/rbac";

import { completeSubtask, createSubtask, deleteSubtask, updateSubtask } from "./mutations";
import { getSubtaskDetailRowById, getSubtasksByTaskId, type SubtaskRow } from "./queries";
import {
  SubtaskCompleteSchema,
  SubtaskCreatePayloadSchema,
  SubtaskIdSchema,
  SubtaskUpdatePayloadSchema,
} from "./schemas";

export async function createSubtaskAction(
  payload: z.input<typeof SubtaskCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const parsed = SubtaskCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("subtask");
  try {
    const session = await requireAuth();
    const parent = await getTaskById(parsed.data.taskId);
    if (!parent) return actionNotFound("Task");
    const access = await getTaskAccessContext(session.id, parent.id);
    if (!can(session.role, "task.update", access)) return actionForbidden();
    if (parent.status === TaskStatus.Done) {
      return actionConflict(
        "Cannot add subtask",
        "The parent task is completed. Reopen the task first.",
      );
    }
    const { id } = await createSubtask({ ...parsed.data, createdBy: session.id });
    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "subtask.created",
        entityType: "Case",
        entityId: parent.case_id,
        details: `Created subtask: "${parsed.data.title}"`,
      }),
    );
    revalidatePath(`/case/${parent.case_id}`);
    return { success: true, data: { id } };
  } catch (error) {
    return toActionResponse(error, "create subtask");
  }
}

export async function updateSubtaskAction(
  payload: z.input<typeof SubtaskUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const parsed = SubtaskUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("subtask");
  try {
    const session = await requireAuth();
    const row = await getSubtaskDetailRowById(parsed.data.subtaskId);
    if (!row) return actionNotFound("Subtask");
    const access = await getTaskAccessContext(session.id, row.task_id);
    if (!can(session.role, "task.update", access)) return actionForbidden();
    await updateSubtask({
      subtaskId: row.id,
      title: parsed.data.title,
      description: parsed.data.description,
      due_date: parsed.data.due_date,
      assignee_ids: parsed.data.assignee_ids,
    });
    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "subtask.updated",
        entityType: "Case",
        entityId: row.case_id,
        details: `Updated subtask: "${parsed.data.title}"`,
      }),
    );
    revalidatePath(`/case/${row.case_id}`);
    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update subtask");
  }
}

export async function getSubtasksByTaskAction(payload: { taskId: string }): Promise<SubtaskRow[]> {
  const { taskId } = payload;
  const session = await requireAuth();
  const access = await getTaskAccessContext(session.id, taskId);
  assertRecordPermission(session, "task.read", access);
  return getSubtasksByTaskId({ taskId });
}

export async function completeSubtaskAction(
  payload: z.input<typeof SubtaskCompleteSchema>,
): Promise<ActionStatusResponse> {
  const parsed = SubtaskCompleteSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("subtask");
  try {
    const session = await requireAuth();
    const row = await getSubtaskDetailRowById(parsed.data.subtaskId);
    if (!row) return actionNotFound("Subtask");
    const access = await getTaskAccessContext(session.id, row.task_id);
    if (!can(session.role, "task.update", access)) return actionForbidden();
    if (row.status === SubtaskStatus.Done) return { success: true };
    await completeSubtask({ subtaskId: row.id, userId: session.id });
    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "subtask.completed",
        entityType: "Case",
        entityId: row.case_id,
        details: `Completed subtask: "${row.title}"`,
      }),
    );
    revalidatePath(`/case/${row.case_id}`);
    return { success: true };
  } catch (error) {
    return toActionResponse(error, "complete subtask");
  }
}

export async function deleteSubtaskAction(
  payload: z.input<typeof SubtaskIdSchema>,
): Promise<ActionStatusResponse> {
  const parsed = SubtaskIdSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("subtask");
  try {
    const session = await requireAuth();
    const row = await getSubtaskDetailRowById(parsed.data.subtaskId);
    if (!row) return actionNotFound("Subtask");
    const access = await getTaskAccessContext(session.id, row.task_id);
    if (!can(session.role, "task.delete", access)) return actionForbidden();
    await deleteSubtask({ subtaskId: row.id });
    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "subtask.deleted",
        entityType: "Case",
        entityId: row.case_id,
        details: `Deleted subtask: "${row.title}"`,
      }),
    );
    revalidatePath(`/case/${row.case_id}`);
    return { success: true };
  } catch (error) {
    return toActionResponse(error, "delete subtask");
  }
}
