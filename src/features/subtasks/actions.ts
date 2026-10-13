"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { getCaseAccessContext, getCaseTitleById } from "@/features/cases/queries";
import { notifyRecipients } from "@/features/notifications/notify";
import type { NotificationDispatchPayload } from "@/features/notifications/schemas";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { NotificationType, SubtaskStatus, TaskStatus } from "@/generated/prisma/browser";
import { logError } from "@/lib/infra/logger";
import { formatDateTime } from "@/lib/primitives/date";
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
import {
  getSubtaskCountsByTaskIds,
  getSubtaskDetailRowById,
  getSubtasksByTaskId,
  type SubtaskDetailRow,
  type SubtaskRow,
} from "./queries";
import {
  SubtaskCompleteSchema,
  SubtaskCreatePayloadSchema,
  SubtaskIdSchema,
  SubtaskUpdatePayloadSchema,
} from "./schemas";

interface SubtaskNotificationDetails {
  subtaskTitle: string;
  parentTitle: string;
  caseId: string;
  dueDate: Date;
}

async function safeNotifyRecipients(
  actorId: string,
  payload: NotificationDispatchPayload,
): Promise<void> {
  try {
    await notifyRecipients(actorId, payload);
  } catch (error) {
    logError("subtask.notify.dispatch", error);
  }
}

async function subtaskNotificationCopy(
  kind: "assigned" | "completed",
  details: SubtaskNotificationDetails,
) {
  let caseName: string | undefined;
  try {
    caseName = (await getCaseTitleById(details.caseId)) ?? undefined;
  } catch (error) {
    logError("subtask.notify.case-title", error);
  }
  const dueDateLabel = formatDateTime(details.dueDate);
  const scope = [details.subtaskTitle, details.parentTitle, ...(caseName ? [caseName] : [])].join(
    " · ",
  );
  if (kind === "assigned") {
    return {
      title: `Subtask assigned: ${scope} · Due ${dueDateLabel}`,
      message: `You have been assigned subtask "${details.subtaskTitle}" under parent task "${details.parentTitle}"${caseName ? ` in case "${caseName}"` : ""}, due ${dueDateLabel}.`,
      subtaskTitle: details.subtaskTitle,
      parentTitle: details.parentTitle,
      caseName,
      dueDateLabel,
    };
  }
  return {
    title: `Subtask completed: ${scope} · Due ${dueDateLabel}`,
    message: `Subtask "${details.subtaskTitle}" under parent task "${details.parentTitle}"${caseName ? ` in case "${caseName}"` : ""} was marked as complete.`,
    subtaskTitle: details.subtaskTitle,
    parentTitle: details.parentTitle,
    caseName,
    dueDateLabel,
  };
}

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
    const newAssigneeIds = [...new Set(parsed.data.assignee_ids)].filter((id) => id !== session.id);
    if (newAssigneeIds.length > 0) {
      after(async () => {
        const copy = await subtaskNotificationCopy("assigned", {
          subtaskTitle: parsed.data.title,
          parentTitle: parent.title,
          caseId: parent.case_id,
          dueDate: parsed.data.due_date,
        });
        await safeNotifyRecipients(session.id, {
          userIds: newAssigneeIds,
          type: NotificationType.SubtaskAssigned,
          title: copy.title,
          message: copy.message,
          actionUrl: `/case/${parent.case_id}?tab=tasks`,
          caseId: parent.case_id,
          taskId: parent.id,
          subtaskTitle: copy.subtaskTitle,
          parentTitle: copy.parentTitle,
          caseName: copy.caseName,
          dueDateLabel: copy.dueDateLabel,
        });
      });
    }
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
    const addedAssigneeIds = parsed.data.assignee_ids
      ? [
          ...new Set(parsed.data.assignee_ids.filter((id) => !row.assignee_ids.includes(id))),
        ].filter((id) => id !== session.id)
      : [];
    if (addedAssigneeIds.length > 0) {
      after(async () => {
        let parentTitle: string | null = null;
        try {
          parentTitle = (await getTaskById(row.task_id))?.title ?? null;
        } catch (error) {
          logError("subtask.notify.parent", error);
        }
        if (!parentTitle) return;
        const copy = await subtaskNotificationCopy("assigned", {
          subtaskTitle: parsed.data.title,
          parentTitle,
          caseId: row.case_id,
          dueDate: parsed.data.due_date,
        });
        await safeNotifyRecipients(session.id, {
          userIds: addedAssigneeIds,
          type: NotificationType.SubtaskAssigned,
          title: copy.title,
          message: copy.message,
          actionUrl: `/case/${row.case_id}?tab=tasks`,
          caseId: row.case_id,
          taskId: row.task_id,
          subtaskTitle: copy.subtaskTitle,
          parentTitle: copy.parentTitle,
          caseName: copy.caseName,
          dueDateLabel: copy.dueDateLabel,
        });
      });
    }
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

export async function getSubtaskDetailAction(payload: {
  subtaskId: string;
}): Promise<SubtaskDetailRow | null> {
  const parsed = SubtaskIdSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Invalid subtask ID");
  const session = await requireAuth();
  const row = await getSubtaskDetailRowById(parsed.data.subtaskId);
  if (!row) return null;
  const access = await getTaskAccessContext(session.id, row.task_id);
  assertRecordPermission(session, "task.read", access);
  return row;
}

export async function getSubtaskCountsByTaskIdsAction(payload: {
  caseId: string;
  taskIds: string[];
}): Promise<Record<string, number>> {
  if (payload.taskIds.length > 100) throw new Error("Too many task IDs");
  const session = await requireAuth();
  const access = await getCaseAccessContext(session.id, payload.caseId);
  assertRecordPermission(session, "task.read", access);
  return getSubtaskCountsByTaskIds({ caseId: payload.caseId, taskIds: payload.taskIds });
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
    after(async () => {
      let parent: Awaited<ReturnType<typeof getTaskById>> = null;
      try {
        parent = await getTaskById(row.task_id);
      } catch (error) {
        logError("subtask.notify.parent", error);
      }
      if (!parent) return;
      const reviewerIds = [
        ...new Set(parent.taskReviewers.map((reviewer) => reviewer.reviewer_user_id)),
      ].filter((id) => id !== session.id);
      if (reviewerIds.length === 0) return;
      const copy = await subtaskNotificationCopy("completed", {
        subtaskTitle: row.title,
        parentTitle: parent.title,
        caseId: row.case_id,
        dueDate: row.due_date,
      });
      await safeNotifyRecipients(session.id, {
        userIds: reviewerIds,
        type: NotificationType.SubtaskCompleted,
        title: copy.title,
        message: copy.message,
        actionUrl: `/case/${row.case_id}?tab=tasks`,
        caseId: row.case_id,
        taskId: row.task_id,
        subtaskTitle: copy.subtaskTitle,
        parentTitle: copy.parentTitle,
        caseName: copy.caseName,
        dueDateLabel: copy.dueDateLabel,
      });
    });
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
