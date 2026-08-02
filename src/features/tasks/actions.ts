"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
import { getCaseAccessContext } from "@/features/cases/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { diffNewAssigneeIds } from "@/features/notifications/recipients";
import { NotificationType } from "@/generated/prisma/browser";
import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { can, FORBIDDEN_MESSAGE } from "@/lib/rbac";

import { createTask, deleteTask, updateTask } from "./mutations";
import {
  getActiveUsers,
  getTaskAccessContext,
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

export async function getTaskDetailRowByIdAction(
  taskId: string,
): Promise<{ row: TaskDetailRow | null; canUpdate: boolean }> {
  const session = await requireAuth();

  const parsed = TaskIdSchema.safeParse({ taskId });
  if (!parsed.success) throw new Error("Invalid task ID");

  const access = await getTaskAccessContext({ userId: session.id, taskId: parsed.data.taskId });
  if (!can(session.role, "task.read", access)) {
    throw new Error("Forbidden");
  }

  const row = await getTaskDetailRowById(parsed.data.taskId);

  return {
    row,
    canUpdate: row !== null && can(session.role, "task.update", access),
  };
}

export async function createTaskAction(
  payload: z.input<typeof TaskCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = TaskCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) return { success: false, error: "Invalid task data" };

  const { title, description, status, case_id, assignee_ids } = parsed.data;

  try {
    const caseAccess = await getCaseAccessContext({ userId: session.id, caseId: case_id });
    if (!can(session.role, "task.create", caseAccess)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    const task = await createTask({
      title,
      description,
      status,
      case_id,
      created_by_user_id: session.id,
      assignee_ids,
    });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "task.created",
          entityType: "Case",
          entityId: case_id,
          details: `Created task: "${title}"`,
        });
      } catch (err) {
        console.error("Failed to log task.created audit for Case", case_id, err);
      }

      try {
        const assigneeIds = parsed.data.assignee_ids ?? [];
        if (assigneeIds.length > 0) {
          await dispatchNotifications(
            {
              userIds: assigneeIds,
              type: NotificationType.TaskAssigned,
              title: `New task: ${title}`,
              message: `You have been assigned a new task: "${title}"`,
              actionUrl: `/case/${case_id}`,
              caseId: case_id,
              taskId: task.id,
            },
            session.id,
            assigneeIds.includes(session.id),
          );
        }
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }
    });

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

    const access = await getTaskAccessContext({ userId: session.id, taskId });
    if (!can(session.role, "task.update", access)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

    const existingAssigneeIds = existing.taskAssignments.map((a) => a.user_id);
    if (
      existing.title === title &&
      existing.description === (description ?? null) &&
      existing.status === status &&
      (!assignee_ids ||
        (existingAssigneeIds.length === assignee_ids.length &&
          existingAssigneeIds.every((id) => assignee_ids.includes(id))))
    ) {
      return { success: true };
    }

    await updateTask(taskId, { title, description, status, assignee_ids });

    after(async () => {
      try {
        await createAuditLog({
          actorUserId: session.id,
          action: "task.updated",
          entityType: "Case",
          entityId: existing.case_id,
          details: `Updated task: "${title}"`,
        });
      } catch (err) {
        console.error("Failed to log task.updated audit for Case", existing.case_id, err);
      }

      if (existing.status !== status) {
        try {
          const assigneeIds =
            parsed.data.assignee_ids ?? existing.taskAssignments.map((a) => a.user_id);
          if (assigneeIds.length > 0) {
            await dispatchNotifications(
              {
                userIds: assigneeIds,
                type: NotificationType.TaskStatusChanged,
                title: `Task updated: ${title}`,
                message: `Task "${title}" status: ${status}`,
                actionUrl: `/case/${existing.case_id}`,
                caseId: existing.case_id,
                taskId: existing.id,
              },
              session.id,
            );
          }
        } catch (err) {
          console.error("Failed to dispatch notification:", err);
        }
      }

      if (parsed.data.assignee_ids) {
        const newAssigneeIds = diffNewAssigneeIds(
          parsed.data.assignee_ids,
          existing.taskAssignments.map((a) => a.user_id),
        );
        if (newAssigneeIds.length > 0) {
          try {
            await dispatchNotifications(
              {
                userIds: newAssigneeIds,
                type: NotificationType.TaskAssigned,
                title: `Task assigned: ${title}`,
                message: `You have been assigned to task: "${title}"`,
                actionUrl: `/case/${existing.case_id}`,
                caseId: existing.case_id,
                taskId: existing.id,
              },
              session.id,
            );
          } catch (err) {
            console.error("Failed to dispatch notification:", err);
          }
        }
      }
    });

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

    const access = await getTaskAccessContext({ userId: session.id, taskId });
    if (!can(session.role, "task.delete", access)) {
      return { success: false, error: FORBIDDEN_MESSAGE };
    }

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
