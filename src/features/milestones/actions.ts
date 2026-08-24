"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { getCaseAccessContext, getCaseAssigneeIds } from "@/features/cases/queries";
import { dispatchNotifications } from "@/features/notifications/dispatch";
import { NotificationType } from "@/generated/prisma/browser";
import {
  actionForbidden,
  actionInvalid,
  actionNotFound,
  type ActionDataResponse,
  type ActionStatusResponse,
} from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { ForbiddenError, toActionResponse } from "@/lib/errors";
import { can } from "@/lib/rbac";

import { createMilestone, deleteMilestone, updateMilestone } from "./mutations";
import {
  getMilestoneAccessContext,
  getMilestoneById,
  getMilestoneRowById,
  type MilestoneRow,
} from "./queries";
import {
  MilestoneCreatePayloadSchema,
  MilestoneIdSchema,
  MilestoneUpdatePayloadSchema,
} from "./schemas";

export async function getMilestoneRowByIdAction(
  milestoneId: string,
): Promise<{ row: MilestoneRow | null; canUpdate: boolean }> {
  const session = await requireAuth();

  const parsed = MilestoneIdSchema.safeParse({ milestoneId });
  if (!parsed.success) {
    throw new Error("Invalid milestone ID");
  }

  const access = await getMilestoneAccessContext({
    userId: session.id,
    milestoneId: parsed.data.milestoneId,
  });
  if (!can(session.role, "milestone.read", access)) {
    throw new ForbiddenError();
  }

  const row = await getMilestoneRowById(parsed.data.milestoneId);

  return {
    row,
    canUpdate: row !== null && can(session.role, "milestone.update", access),
  };
}

export async function createMilestoneAction(
  payload: z.input<typeof MilestoneCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = MilestoneCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("milestone");

  const { title, description, due_date, status, case_id, reminder_days } = parsed.data;

  try {
    const caseAccess = await getCaseAccessContext(session.id, case_id);
    if (!can(session.role, "milestone.create", caseAccess)) {
      return actionForbidden();
    }

    const milestone = await createMilestone({
      title,
      description: description || undefined,
      due_date,
      status,
      case_id,
      created_by_user_id: session.id,
      reminder_days,
    });

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "milestone.created",
        entityType: "Case",
        entityId: case_id,
        details: `Created milestone: "${title}"`,
      }),
    );

    revalidatePath(`/case/${case_id}`);

    return { success: true, data: { id: milestone.id } };
  } catch (error) {
    return toActionResponse(error, "create milestone");
  }
}

export async function updateMilestoneAction(
  payload: z.input<typeof MilestoneUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = MilestoneUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("milestone");

  const { milestoneId, title, description, due_date, status, reminder_days } = parsed.data;

  try {
    const existing = await getMilestoneById(milestoneId);
    if (!existing) return actionNotFound("Milestone");

    const access = await getMilestoneAccessContext({ userId: session.id, milestoneId });
    if (!can(session.role, "milestone.update", access)) {
      return actionForbidden();
    }

    if (
      existing.title === title &&
      existing.description === (description || null) &&
      existing.due_date.getTime() === due_date.getTime() &&
      existing.status === status &&
      (reminder_days === undefined || existing.reminder_days === reminder_days)
    ) {
      return { success: true };
    }

    const resetReminderTiming =
      existing.due_date.getTime() !== due_date.getTime() ||
      (reminder_days !== undefined && existing.reminder_days !== reminder_days);

    await updateMilestone(milestoneId, {
      title,
      description: description || undefined,
      due_date,
      status,
      reminder_days,
      resetReminderTiming,
    });

    after(async () => {
      await logAudit({
        actorUserId: session.id,
        action: "milestone.updated",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Updated milestone: "${title}"`,
      });

      try {
        const assigneeIds = await getCaseAssigneeIds(existing.case_id);
        if (assigneeIds.length === 0) return;
        if (existing.status === status) return;

        await dispatchNotifications(
          {
            userIds: assigneeIds,
            type: NotificationType.MilestoneStatusChanged,
            title: `Milestone status changed: ${title}`,
            message: `Milestone "${title}" status changed from ${existing.status} to ${status}`,
            actionUrl: `/case/${existing.case_id}`,
            caseId: existing.case_id,
            milestoneId: existing.id,
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
    return toActionResponse(error, "update milestone");
  }
}

export async function deleteMilestoneAction(
  payload: z.input<typeof MilestoneIdSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = MilestoneIdSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("milestone");

  const { milestoneId } = parsed.data;

  try {
    const existing = await getMilestoneById(milestoneId);
    if (!existing) return actionNotFound("Milestone");

    const access = await getMilestoneAccessContext({ userId: session.id, milestoneId });
    if (!can(session.role, "milestone.delete", access)) {
      return actionForbidden();
    }

    await deleteMilestone(milestoneId);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "milestone.deleted",
        entityType: "Case",
        entityId: existing.case_id,
        details: `Deleted milestone: "${existing.title}"`,
      }),
    );

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "delete milestone");
  }
}
