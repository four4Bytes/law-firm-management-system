"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { getCaseAccessContext } from "@/features/cases/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { diffNewAssigneeIds } from "@/features/notifications/recipients";
import { NotificationType, TaskStatus } from "@/generated/prisma/browser";
import {
  actionConflict,
  actionForbidden,
  actionInvalid,
  actionNotFound,
  type ActionDataResponse,
  type ActionStatusResponse,
} from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { ForbiddenError, TaskCancelledError, toActionResponse } from "@/lib/errors";
import { can } from "@/lib/rbac";

import {
  addTaskReviewer,
  applyReviewDecision,
  cancelTask,
  createTask,
  deleteTask,
  removeTaskReviewer,
  reopenTask,
  setAssignmentStatus,
  updateTask,
} from "./mutations";
import {
  getActiveUsers,
  getTaskAccessContext,
  getTaskById,
  getTaskDetailRowById,
  getTaskReviewers,
  type ActiveUserSummary,
  type TaskDetailRow,
} from "./queries";
import {
  TaskAddReviewerSchema,
  TaskCreatePayloadSchema,
  TaskIdSchema,
  TaskRemoveReviewerSchema,
  TaskReviewSchema,
  TaskStatusChangeSchema,
  TaskSubmitSchema,
  TaskUpdatePayloadSchema,
} from "./schemas";

/** Per-user capabilities on a single task, computed server-side (never client RBAC). */
export interface TaskCapabilities {
  isCreator: boolean;
  isReviewer: boolean;
  canSubmit: boolean;
  canReview: boolean;
  canSetStatus: boolean;
  canManageReviewers: boolean;
  canEdit: boolean;
}

export async function getActiveUsersAction(): Promise<ActiveUserSummary[]> {
  await requireAuth();
  return getActiveUsers();
}

export async function getTaskDetailRowByIdAction(taskId: string): Promise<{
  row: TaskDetailRow | null;
  canUpdate: boolean;
  capabilities: TaskCapabilities;
  currentUserId: string;
}> {
  const session = await requireAuth();

  const parsed = TaskIdSchema.safeParse({ taskId });
  if (!parsed.success) throw new Error("Invalid task ID");

  const access = await getTaskAccessContext(session.id, parsed.data.taskId);
  if (!can(session.role, "task.read", access)) {
    throw new ForbiddenError();
  }

  const row = await getTaskDetailRowById(parsed.data.taskId);

  if (!row) {
    return {
      row: null,
      canUpdate: false,
      currentUserId: session.id,
      capabilities: {
        isCreator: false,
        isReviewer: false,
        canSubmit: false,
        canReview: false,
        canSetStatus: false,
        canManageReviewers: false,
        canEdit: false,
      },
    };
  }

  const canUpdate = can(session.role, "task.update", access);
  const isCreator = row.created_by_user_id === session.id;
  const reviewer = row.reviewers.find((r) => r.reviewer_user_id === session.id);
  const isReviewer = reviewer !== undefined;
  const isAssignee = row.assignee_ids.includes(session.id);

  const capabilities: TaskCapabilities = {
    isCreator,
    isReviewer,
    canSubmit:
      isAssignee && (row.status === TaskStatus.Pending || row.status === TaskStatus.Submitted),
    canReview: isReviewer && row.status === TaskStatus.Submitted && !reviewer?.reviewed_at,
    canSetStatus: isCreator,
    canManageReviewers: isCreator || isReviewer,
    canEdit: canUpdate && row.status !== TaskStatus.Cancelled,
  };

  return { row, canUpdate, capabilities, currentUserId: session.id };
}

export async function createTaskAction(
  payload: z.input<typeof TaskCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = TaskCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("task");

  const { title, description, case_id, assignee_ids } = parsed.data;

  try {
    const caseAccess = await getCaseAccessContext(session.id, case_id);
    if (!can(session.role, "task.create", caseAccess)) {
      return actionForbidden();
    }

    const task = await createTask({
      title,
      description,
      case_id,
      created_by_user_id: session.id,
      assignee_ids,
    });

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "task.created",
        entityType: "Case",
        entityId: case_id,
        details: `Created task: "${title}"`,
      }),
    );

    revalidatePath(`/case/${case_id}`);

    return { success: true, data: { id: task.id } };
  } catch (error) {
    return toActionResponse(error, "create task");
  }
}

export async function updateTaskAction(
  payload: z.input<typeof TaskUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = TaskUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("task");

  const { taskId, title, description, assignee_ids } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    const access = await getTaskAccessContext(session.id, taskId);

    if (existing.status === TaskStatus.Cancelled) {
      return actionConflict("Task locked", "A cancelled task is locked and cannot be edited.");
    }

    if (!can(session.role, "task.update", access)) {
      return actionForbidden();
    }

    const existingAssigneeIds = existing.taskAssignments.map((a) => a.user_id);
    const assigneesChanged =
      assignee_ids !== undefined &&
      (existingAssigneeIds.length !== assignee_ids.length ||
        !existingAssigneeIds.every((id) => assignee_ids.includes(id)));

    if (assigneesChanged && !access.own) {
      return actionConflict("Not allowed", "Only the task creator can change assignees.");
    }

    if (
      existing.title === title &&
      existing.description === (description ?? null) &&
      !assigneesChanged
    ) {
      return { success: true };
    }

    await updateTask(
      taskId,
      assigneesChanged ? { title, description, assignee_ids } : { title, description },
    );

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "task.updated",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Updated task: "${title}"`,
      });

      const newAssigneeIds = diffNewAssigneeIds(
        parsed.data.assignee_ids ?? existingAssigneeIds,
        existingAssigneeIds,
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
    });

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update task");
  }
}

export async function deleteTaskAction(
  payload: z.input<typeof TaskIdSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = TaskIdSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("task");

  const { taskId } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    const access = await getTaskAccessContext(session.id, taskId);
    if (!can(session.role, "task.delete", access)) {
      return actionForbidden();
    }

    await deleteTask(taskId);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "task.deleted",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Deleted task: "${existing.title}"`,
      }),
    );

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "delete task");
  }
}

export async function submitTaskAction(
  payload: z.input<typeof TaskSubmitSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = TaskSubmitSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("task");

  const { taskId, status } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    if (existing.status !== TaskStatus.Pending && existing.status !== TaskStatus.Submitted) {
      return actionConflict("Task locked", "The task is locked and cannot be submitted.");
    }

    const access = await getTaskAccessContext(session.id, taskId);
    if (!can(session.role, "task.update", access)) return actionForbidden();

    const isAssignee = existing.taskAssignments.some((a) => a.user_id === session.id);
    if (!isAssignee) return actionForbidden();

    const before = existing.status;
    const { taskStatus } = await setAssignmentStatus(taskId, session.id, status);

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "task.submitted",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Submitted task for review: "${existing.title}"`,
      });

      if (taskStatus === TaskStatus.Submitted && before !== TaskStatus.Submitted) {
        try {
          const reviewers = await getTaskReviewers(taskId);
          const reviewerIds = reviewers.map((r) => r.reviewer_user_id);
          if (reviewerIds.length > 0) {
            await dispatchNotifications(
              {
                userIds: reviewerIds,
                type: NotificationType.TaskStatusChanged,
                title: `Task submitted for review: ${existing.title}`,
                message: `Task "${existing.title}" is now under review`,
                actionUrl: `/case/${existing.case_id}`,
                caseId: existing.case_id,
                taskId,
              },
              session.id,
            );
          }
        } catch (err) {
          console.error("Failed to dispatch notification:", err);
        }
      }
    });

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "submit task");
  }
}

export async function reviewTaskAction(
  payload: z.input<typeof TaskReviewSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = TaskReviewSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("review");

  const { taskId, decision } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    if (existing.status !== TaskStatus.Submitted) {
      return actionConflict("Cannot review task", "Only submitted tasks can be reviewed.");
    }

    const access = await getTaskAccessContext(session.id, taskId);
    const review = existing.taskReviewers.find((r) => r.reviewer_user_id === session.id);
    if (!can(session.role, "task.update", access) || !review) {
      return actionForbidden();
    }
    if (review.reviewed_at) {
      return actionConflict("Already reviewed", "You have already reviewed this task.");
    }

    const { taskStatus } = await applyReviewDecision({
      taskId,
      reviewerUserId: session.id,
      decision,
    });

    const assigneeIds = existing.taskAssignments.map((a) => a.user_id);

    after(async () => {
      const transition = `Submitted to ${taskStatus}`;
      await logAudit({
        actorUserId: session.id,
        action: "task.reviewed",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Review ${decision} on task "${existing.title}"`,
      });

      if (taskStatus === TaskStatus.Pending || taskStatus === TaskStatus.Completed) {
        try {
          await dispatchNotifications(
            {
              userIds: assigneeIds,
              type: NotificationType.TaskStatusChanged,
              title: `Task ${taskStatus === TaskStatus.Completed ? "completed" : "returned for rework"}: ${existing.title}`,
              message: `Task "${existing.title}" transitioned from ${transition}`,
              actionUrl: `/case/${existing.case_id}`,
              caseId: existing.case_id,
              taskId,
            },
            session.id,
          );
        } catch (err) {
          console.error("Failed to dispatch notification:", err);
        }
      }
    });

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "record review");
  }
}

export async function addTaskReviewerAction(
  payload: z.input<typeof TaskAddReviewerSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = TaskAddReviewerSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("reviewer");

  const { taskId, reviewerUserId } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    if (existing.status === TaskStatus.Cancelled) {
      return actionConflict("Task cancelled", "Cannot add a reviewer to a cancelled task.");
    }

    const access = await getTaskAccessContext(session.id, taskId);
    const isReviewer = existing.taskReviewers.some((r) => r.reviewer_user_id === session.id);
    if (!can(session.role, "task.update", access) || (!access.own && !isReviewer)) {
      return actionForbidden();
    }

    await addTaskReviewer(taskId, reviewerUserId);

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "task.updated",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Added reviewer to task: "${existing.title}"`,
      });

      try {
        await dispatchNotifications(
          {
            userIds: [reviewerUserId],
            type: NotificationType.TaskAssigned,
            title: `Review requested: ${existing.title}`,
            message: `You have been added as a reviewer to task: "${existing.title}"`,
            actionUrl: `/case/${existing.case_id}`,
            caseId: existing.case_id,
            taskId,
          },
          session.id,
        );
      } catch (err) {
        console.error("Failed to dispatch notification:", err);
      }
    });

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "add reviewer");
  }
}

export async function removeTaskReviewerAction(
  payload: z.input<typeof TaskRemoveReviewerSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = TaskRemoveReviewerSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("reviewer");

  const { taskId, reviewerUserId } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    const access = await getTaskAccessContext(session.id, taskId);
    if (!can(session.role, "task.update", access) || !access.own) {
      return actionForbidden();
    }

    if (reviewerUserId === existing.created_by_user_id) {
      return actionConflict("Not allowed", "Cannot remove the task creator as a reviewer.");
    }

    await removeTaskReviewer(taskId, reviewerUserId);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "task.updated",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Removed reviewer from task: "${existing.title}"`,
      }),
    );

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "remove reviewer");
  }
}

export async function setTaskStatusAction(
  payload: z.input<typeof TaskStatusChangeSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = TaskStatusChangeSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("task");

  const { taskId, status } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    const access = await getTaskAccessContext(session.id, taskId);
    if (!can(session.role, "task.delete", access) || !access.own) {
      return actionForbidden();
    }

    let changed = true;
    if (status === TaskStatus.Cancelled) {
      await cancelTask(taskId);
    } else {
      changed = (await reopenTask(taskId)).reopened;
    }

    if (changed) {
      after(() =>
        logAudit({
          actorUserId: session.id,
          action: "task.updated",
          entityType: "Case",
          entityId: existing.case_id,
          details:
            status === TaskStatus.Cancelled
              ? `Cancelled task: "${existing.title}"`
              : `Reopened task: "${existing.title}"`,
        }),
      );
    }

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch (error) {
    if (error instanceof TaskCancelledError) {
      return actionConflict(
        "Task cancelled",
        status === TaskStatus.Cancelled
          ? "This task has already been cancelled."
          : "A cancelled task cannot be reopened.",
      );
    }
    return toActionResponse(error, "update task status");
  }
}
