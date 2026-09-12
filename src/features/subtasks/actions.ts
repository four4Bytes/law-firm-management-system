"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { diffNewAssigneeIds } from "@/features/notifications/recipients";
import { getTaskAccessContext, getTaskById } from "@/features/tasks/queries";
import { getActiveUserIds } from "@/features/users/queries";
import { NotificationType, SubtaskStatus } from "@/generated/prisma/browser";
import {
  actionConflict,
  actionForbidden,
  actionInvalid,
  actionNotFound,
  type ActionDataResponse,
  type ActionStatusResponse,
} from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { ForbiddenError, TaskLockedError, toActionResponse } from "@/lib/errors";
import { can } from "@/lib/rbac";

import { createSubtask, deleteSubtask, setSubtaskStatus, updateSubtask } from "./mutations";
import {
  getSubtaskById,
  getSubtaskProgress,
  getSubtaskRowById,
  getSubtasksByTaskId,
  type SubtaskProgress,
  type SubtaskRow,
} from "./queries";
import {
  SubtaskCreatePayloadSchema,
  SubtaskIdSchema,
  SubtaskStatusChangeSchema,
  SubtaskUpdatePayloadSchema,
} from "./schemas";

export async function getSubtasksByTaskAction(
  taskId: string,
): Promise<{ rows: SubtaskRow[]; progress: SubtaskProgress }> {
  const session = await requireAuth();

  const parsed = z.uuid().safeParse(taskId);
  if (!parsed.success) throw new Error("Invalid task ID");

  const access = await getTaskAccessContext(session.id, parsed.data);
  if (!can(session.role, "task.read", access)) {
    throw new ForbiddenError();
  }

  const [rows, progress] = await Promise.all([
    getSubtasksByTaskId(parsed.data),
    getSubtaskProgress(parsed.data),
  ]);

  return { rows, progress };
}

export async function getSubtaskRowByIdAction(subtaskId: string): Promise<{
  row: SubtaskRow | null;
  canUpdate: boolean;
}> {
  const session = await requireAuth();

  const parsed = SubtaskIdSchema.safeParse({ subtaskId });
  if (!parsed.success) throw new Error("Invalid subtask ID");

  const existing = await getSubtaskById(parsed.data.subtaskId);
  if (!existing) return { row: null, canUpdate: false };

  const access = await getTaskAccessContext(session.id, existing.task_id);
  if (!can(session.role, "task.read", access)) {
    throw new ForbiddenError();
  }

  const row = await getSubtaskRowById(parsed.data.subtaskId);

  return {
    row,
    canUpdate: row !== null && can(session.role, "task.update", access),
  };
}

async function resolveCaseId(taskId: string): Promise<string | null> {
  const task = await getTaskById(taskId);
  return task?.case_id ?? null;
}

export async function createSubtaskAction(
  payload: z.input<typeof SubtaskCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = SubtaskCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("subtask");

  const { task_id, title, description, priority, due_date, status, reminder_days, assignee_ids } =
    parsed.data;

  try {
    const parent = await getTaskById(task_id);
    if (!parent) return actionNotFound("Parent task");

    const access = await getTaskAccessContext(session.id, task_id);
    if (!can(session.role, "task.create", access)) {
      return actionForbidden();
    }

    const activeIds = await getActiveUserIds({ ids: assignee_ids });
    if (activeIds.length !== new Set(assignee_ids).size) {
      return actionInvalid("subtask");
    }

    const subtask = await createSubtask({
      title,
      description,
      priority,
      due_date,
      status,
      reminder_days,
      task_id,
      created_by_user_id: session.id,
      assignee_ids,
    });

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "subtask.created",
        entityType: "Task",
        entityId: task_id,
        details: `${session.name} created subtask '${title}'.`,
      });

      try {
        await dispatchNotifications(
          {
            userIds: assignee_ids,
            type: NotificationType.TaskAssigned,
            title: `Subtask assigned: ${title}`,
            message: `You have been assigned to subtask: "${title}"`,
            actionUrl: parent.case_id ? `/case/${parent.case_id}` : undefined,
            caseId: parent.case_id,
            taskId: task_id,
            subtaskId: subtask.id,
          },
          session.id,
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }
    });

    const caseId = await resolveCaseId(task_id);
    if (caseId) revalidatePath(`/case/${caseId}`);

    return { success: true, data: { id: subtask.id } };
  } catch (error) {
    if (error instanceof TaskLockedError) {
      return actionConflict(
        "Task locked",
        "This task is cancelled and its subtasks cannot be modified.",
      );
    }
    return toActionResponse(error, "create subtask");
  }
}

export async function updateSubtaskAction(
  payload: z.input<typeof SubtaskUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = SubtaskUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("subtask");

  const { subtaskId, title, description, priority, due_date, status, reminder_days, assignee_ids } =
    parsed.data;

  try {
    const existing = await getSubtaskById(subtaskId);
    if (!existing) return actionNotFound("Subtask");

    const access = await getTaskAccessContext(session.id, existing.task_id);
    if (!can(session.role, "task.update", access)) {
      return actionForbidden();
    }

    const existingAssigneeIds = existing.assignments.map((a) => a.user_id);
    const assigneesChanged =
      existingAssigneeIds.length !== assignee_ids.length ||
      !existingAssigneeIds.every((id) => assignee_ids.includes(id));

    if (assigneesChanged && !access.own) {
      return actionForbidden();
    }

    if (assigneesChanged) {
      const activeIds = await getActiveUserIds({ ids: assignee_ids });
      if (activeIds.length !== new Set(assignee_ids).size) {
        return actionInvalid("subtask");
      }
    }

    const statusChanged = existing.status !== status;

    if (
      existing.title === title &&
      existing.description === (description ?? null) &&
      (existing.priority ?? null) === (priority ?? null) &&
      (existing.due_date?.getTime() ?? null) === (due_date?.getTime() ?? null) &&
      !statusChanged &&
      (existing.reminder_days ?? null) === (reminder_days ?? null) &&
      !assigneesChanged
    ) {
      return { success: true };
    }

    await updateSubtask(
      subtaskId,
      assigneesChanged
        ? { title, description, priority, due_date, status, reminder_days, assignee_ids }
        : { title, description, priority, due_date, status, reminder_days },
    );

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "subtask.updated",
        entityType: "Task",
        entityId: existing.task_id,
        details: statusChanged
          ? `${session.name} changed subtask '${title}' from ${existing.status} to ${status}.`
          : `${session.name} updated subtask '${title}'.`,
      });

      try {
        if (statusChanged) {
          await dispatchNotifications(
            {
              userIds: assignee_ids,
              type: NotificationType.TaskStatusChanged,
              title: `Subtask status changed: ${title}`,
              message: `Subtask "${title}" status changed from ${existing.status} to ${status}`,
              actionUrl: existing.task.case_id ? `/case/${existing.task.case_id}` : undefined,
              caseId: existing.task.case_id,
              taskId: existing.task_id,
              subtaskId,
            },
            session.id,
          );
        }

        const newAssigneeIds = diffNewAssigneeIds(assignee_ids, existingAssigneeIds);
        if (newAssigneeIds.length > 0) {
          await dispatchNotifications(
            {
              userIds: newAssigneeIds,
              type: NotificationType.TaskAssigned,
              title: `Subtask assigned: ${title}`,
              message: `${session.name} assigned you to subtask '${title}'.`,
              actionUrl: existing.task.case_id ? `/case/${existing.task.case_id}` : undefined,
              caseId: existing.task.case_id,
              taskId: existing.task_id,
              subtaskId,
            },
            session.id,
          );
        }
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }
    });

    const caseId = await resolveCaseId(existing.task_id);
    if (caseId) revalidatePath(`/case/${caseId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof TaskLockedError) {
      return actionConflict(
        "Task locked",
        "This task is cancelled and its subtasks cannot be modified.",
      );
    }
    return toActionResponse(error, "update subtask");
  }
}

export async function deleteSubtaskAction(
  payload: z.input<typeof SubtaskIdSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = SubtaskIdSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("subtask");

  const { subtaskId } = parsed.data;

  try {
    const existing = await getSubtaskById(subtaskId);
    if (!existing) return actionNotFound("Subtask");

    const access = await getTaskAccessContext(session.id, existing.task_id);
    if (!can(session.role, "task.delete", access)) {
      return actionForbidden();
    }

    await deleteSubtask(subtaskId);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "subtask.deleted",
        entityType: "Task",
        entityId: existing.task_id,
        details: `${session.name} deleted subtask '${existing.title}'.`,
      }),
    );

    const caseId = await resolveCaseId(existing.task_id);
    if (caseId) revalidatePath(`/case/${caseId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof TaskLockedError) {
      return actionConflict(
        "Task locked",
        "This task is cancelled and its subtasks cannot be modified.",
      );
    }
    return toActionResponse(error, "delete subtask");
  }
}

export async function setSubtaskStatusAction(
  payload: z.input<typeof SubtaskStatusChangeSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = SubtaskStatusChangeSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("subtask");

  const { subtaskId, status } = parsed.data;

  try {
    const existing = await getSubtaskById(subtaskId);
    if (!existing) return actionNotFound("Subtask");

    const access = await getTaskAccessContext(session.id, existing.task_id);
    if (!can(session.role, "task.update", access)) {
      return actionForbidden();
    }

    if (existing.status === status) return { success: true };

    await setSubtaskStatus(subtaskId, status as SubtaskStatus);

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "subtask.status-changed",
        entityType: "Task",
        entityId: existing.task_id,
        details: `${session.name} changed subtask '${existing.title}' from ${existing.status} to ${status}.`,
      });

      try {
        await dispatchNotifications(
          {
            userIds: existing.assignments.map((a) => a.user_id),
            type: NotificationType.TaskStatusChanged,
            title: `Subtask status changed: ${existing.title}`,
            message: `Subtask "${existing.title}" status changed from ${existing.status} to ${status}`,
            actionUrl: existing.task.case_id ? `/case/${existing.task.case_id}` : undefined,
            caseId: existing.task.case_id,
            taskId: existing.task_id,
            subtaskId,
          },
          session.id,
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }
    });

    const caseId = await resolveCaseId(existing.task_id);
    if (caseId) revalidatePath(`/case/${caseId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof TaskLockedError) {
      return actionConflict(
        "Task locked",
        "This task is cancelled and its subtasks cannot be modified.",
      );
    }
    return toActionResponse(error, "update subtask status");
  }
}
