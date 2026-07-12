"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";

import { createMilestone, deleteMilestone, updateMilestone } from "./mutations";
import { getMilestoneById, getMilestoneRowById, type MilestoneRow } from "./queries";
import {
  MilestoneCreatePayloadSchema,
  MilestoneIdSchema,
  MilestoneUpdatePayloadSchema,
} from "./schemas";

export async function getMilestoneRowByIdAction(milestoneId: string): Promise<MilestoneRow | null> {
  await requireAuth();

  const parsed = MilestoneIdSchema.safeParse({ milestoneId });
  if (!parsed.success) {
    throw new Error("Invalid milestone ID");
  }

  return getMilestoneRowById(parsed.data.milestoneId);
}

export async function createMilestoneAction(
  payload: z.input<typeof MilestoneCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = MilestoneCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid milestone data" };
  }

  const { title, description, due_date, status, case_id } = parsed.data;

  try {
    const milestone = await createMilestone({
      title,
      description: description || undefined,
      due_date,
      status,
      case_id,
      created_by_user_id: session.id,
    });

    void createAuditLog({
      actorUserId: session.id,
      action: "milestone.created",
      entityType: "Case",
      entityId: case_id,
      details: `Created milestone: "${title}"`,
    }).catch(console.error);

    revalidatePath(`/case/${case_id}`);

    return { success: true, data: { id: milestone.id } };
  } catch {
    return { success: false, error: "Failed to create milestone" };
  }
}

export async function updateMilestoneAction(
  payload: z.input<typeof MilestoneUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = MilestoneUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid milestone data" };
  }

  const { milestoneId, title, description, due_date, status } = parsed.data;

  try {
    const existing = await getMilestoneById(milestoneId);
    if (!existing) return { success: false, error: "Milestone not found" };

    await updateMilestone(milestoneId, {
      title,
      description: description || undefined,
      due_date,
      status,
    });

    void createAuditLog({
      actorUserId: session.id,
      action: "milestone.updated",
      entityType: "Case",
      entityId: existing.case_id,
      details: `Updated milestone: "${existing.title}"`,
    }).catch(console.error);

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update milestone" };
  }
}

export async function deleteMilestoneAction(
  payload: z.input<typeof MilestoneIdSchema>,
): Promise<ActionStatusResponse> {
  const session = await requireAuth();

  const parsed = MilestoneIdSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid milestone ID" };
  }

  const { milestoneId } = parsed.data;

  try {
    const existing = await getMilestoneById(milestoneId);
    if (!existing) return { success: false, error: "Milestone not found" };

    await deleteMilestone(milestoneId);

    void createAuditLog({
      actorUserId: session.id,
      action: "milestone.deleted",
      entityType: "Case",
      entityId: existing.case_id,
      details: `Deleted milestone: "${existing.title}"`,
    }).catch(console.error);

    revalidatePath(`/case/${existing.case_id}`);

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete milestone" };
  }
}
