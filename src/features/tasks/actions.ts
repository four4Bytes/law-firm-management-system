"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { getCaseAccessContext } from "@/features/cases/queries";
import { notifyRecipients } from "@/features/notifications/notify";
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
import { ForbiddenError, toActionResponse } from "@/lib/errors";
import { logError } from "@/lib/logger";
import { can } from "@/lib/rbac";

import { getTaskStatusLabel } from "./display";
import {
  addTaskReviewer,
  applyReviewDecision,
  createTask,
  deleteTask,
  removeTaskReviewer,
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
  TaskSubmitSchema,
  TaskUpdatePayloadSchema,
} from "./schemas";
import {
  hasAssigneeReviewerOverlap,
  hasNoAssignee,
  isReviewerAssignee,
  wouldLeaveNoReviewer,
} from "./validation";

/** Per-user capabilities on a single task, computed server-side (never client RBAC). */
export interface TaskCapabilities {
  isCreator: boolean;
  isReviewer: boolean;
  canSubmit: boolean;
  canReview: boolean;
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
      isAssignee && (row.status === TaskStatus.Pending || row.status === TaskStatus.InReview),
    canReview: isReviewer && row.status === TaskStatus.InReview && !reviewer?.reviewed_at,
    canManageReviewers: isCreator || isReviewer,
    canEdit: canUpdate && row.status !== TaskStatus.Done,
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

    if (hasNoAssignee(assignee_ids)) {
      return actionConflict(
        "At least one assignee required",
        "A task must have at least one assignee. Add a user before saving.",
      );
    }

    if (isReviewerAssignee(session.id, assignee_ids)) {
      return actionConflict(
        "Assignee and reviewer must be distinct",
        "A user cannot be both assignee and reviewer on the same task. Remove yourself from assignees or choose a different reviewer.",
      );
    }

    const task = await createTask({
      title,
      description,
      case_id,
      created_by_user_id: session.id,
      assignee_ids,
    });

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "task.created",
        entityType: "Case",
        entityId: case_id,
        details: `Created task: "${title}"`,
      });

      await notifyRecipients(session.id, {
        userIds: assignee_ids,
        type: NotificationType.TaskAssigned,
        title: `Task assigned: ${title}`,
        message: `You have been assigned to task: "${title}"`,
        actionUrl: `/case/${case_id}`,
        caseId: case_id,
        taskId: task.id,
      });
    });

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

  const { taskId, title, description, assignee_ids, reviewer_ids, removed_reviewer_ids } =
    parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    const access = await getTaskAccessContext(session.id, taskId);

    if (!can(session.role, "task.update", access)) {
      return actionForbidden();
    }

    const existingAssigneeIds = existing.taskAssignments.map((a) => a.user_id);
    const assigneesChanged =
      assignee_ids !== undefined &&
      (existingAssigneeIds.length !== assignee_ids.length ||
        !existingAssigneeIds.every((id) => assignee_ids.includes(id)));

    if (existing.status === TaskStatus.Done) {
      return actionConflict(
        "Task locked",
        "A completed task is locked. Add a reviewer to reopen it before making changes.",
      );
    }

    if (assigneesChanged && !access.own) {
      return actionConflict("Not allowed", "Only the task creator can change assignees.");
    }

    if (assignee_ids !== undefined) {
      if (hasNoAssignee(assignee_ids)) {
        return actionConflict(
          "At least one assignee required",
          "A task must have at least one assignee. Add a user before saving.",
        );
      }
      if (
        hasAssigneeReviewerOverlap(
          assignee_ids,
          existing.taskReviewers.map((r) => r.reviewer_user_id),
        )
      ) {
        return actionConflict(
          "Assignee and reviewer must be distinct",
          "A user cannot be both assignee and reviewer on the same task. Remove the overlapping user from one role.",
        );
      }
    }

    if (
      existing.title === title &&
      existing.description === (description ?? null) &&
      !assigneesChanged &&
      !reviewer_ids?.length &&
      !removed_reviewer_ids?.length
    ) {
      return { success: true };
    }

    await updateTask(taskId, {
      title,
      description,
      assignee_ids,
      reviewer_ids,
      removed_reviewer_ids,
    });

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
      ).filter((id) => !existing.taskReviewers.some((r) => r.reviewer_user_id === id));

      if (newAssigneeIds.length > 0) {
        await notifyRecipients(session.id, {
          userIds: newAssigneeIds,
          type: NotificationType.TaskAssigned,
          title: `Task assigned: ${title}`,
          message: `You have been assigned to task: "${title}"`,
          actionUrl: `/case/${existing.case_id}`,
          caseId: existing.case_id,
          taskId: existing.id,
        });
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
): Promise<ActionDataResponse<{ taskStatus: TaskStatus }>> {
  const session = await requireAuth();

  const parsed = TaskSubmitSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("task");

  const { taskId, status } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    if (existing.status !== TaskStatus.Pending && existing.status !== TaskStatus.InReview) {
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

      if (taskStatus === TaskStatus.InReview && before !== TaskStatus.InReview) {
        try {
          const reviewers = await getTaskReviewers(taskId);
          const reviewerIds = reviewers.map((r) => r.reviewer_user_id);
          if (reviewerIds.length > 0) {
            await notifyRecipients(session.id, {
              userIds: reviewerIds,
              type: NotificationType.TaskStatusChanged,
              title: `Task submitted for review: ${existing.title}`,
              message: `Task "${existing.title}" is now under review`,
              actionUrl: `/case/${existing.case_id}`,
              caseId: existing.case_id,
              taskId,
            });
          }
        } catch (err) {
          logError("submit task", err);
        }
      }
    });

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true, data: { taskStatus } };
  } catch (error) {
    return toActionResponse(error, "submit task");
  }
}

export async function reviewTaskAction(
  payload: z.input<typeof TaskReviewSchema>,
): Promise<ActionDataResponse<{ taskStatus: TaskStatus }>> {
  const session = await requireAuth();

  const parsed = TaskReviewSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("review");

  const { taskId, decision } = parsed.data;

  try {
    const existing = await getTaskById(taskId);
    if (!existing) return actionNotFound("Task");

    if (existing.status !== TaskStatus.InReview) {
      return actionConflict("Cannot review task", "Only tasks in review can be reviewed.");
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
      const transition = `In Review to ${getTaskStatusLabel(taskStatus)}`;
      await logAudit({
        actorUserId: session.id,
        action: "task.reviewed",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Review ${decision} on task "${existing.title}"`,
      });

      if (taskStatus === TaskStatus.Pending || taskStatus === TaskStatus.Done) {
        await notifyRecipients(session.id, {
          userIds: assigneeIds,
          type: NotificationType.TaskStatusChanged,
          title: `Task ${taskStatus === TaskStatus.Done ? "completed" : "returned for rework"}: ${existing.title}`,
          message: `Task "${existing.title}" transitioned from ${transition}`,
          actionUrl: `/case/${existing.case_id}`,
          caseId: existing.case_id,
          taskId,
        });
      }
    });

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true, data: { taskStatus } };
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

    const access = await getTaskAccessContext(session.id, taskId);
    const isReviewer = existing.taskReviewers.some((r) => r.reviewer_user_id === session.id);
    if (!can(session.role, "task.update", access) || (!access.own && !isReviewer)) {
      return actionForbidden();
    }

    if (existing.taskAssignments.some((a) => a.user_id === reviewerUserId)) {
      return actionConflict(
        "Assignee and reviewer must be distinct",
        "A user cannot be both assignee and reviewer on the same task. Remove the user from assignees first.",
      );
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

      const alreadyAssignee = existing.taskAssignments.some((a) => a.user_id === reviewerUserId);
      if (!alreadyAssignee) {
        await notifyRecipients(session.id, {
          userIds: [reviewerUserId],
          type: NotificationType.TaskAssigned,
          title: `Review requested: ${existing.title}`,
          message: `You have been added as a reviewer to task: "${existing.title}"`,
          actionUrl: `/case/${existing.case_id}`,
          caseId: existing.case_id,
          taskId,
        });
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

    if (wouldLeaveNoReviewer(existing.taskReviewers.length - 1)) {
      return actionConflict(
        "At least one reviewer required",
        "A task must have at least one reviewer. Add a reviewer before removing this one.",
      );
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
