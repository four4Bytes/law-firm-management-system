import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import { canTransition, MILESTONE_TRANSITIONS } from "@/lib/lifecycle";

/** Allowed transitions for each milestone status. */
export const MILESTONE_STATUS_TRANSITIONS = MILESTONE_TRANSITIONS;

/**
 * Determines whether a status transition is valid according to the milestone
 * state machine. A transition to the same status is not considered valid for
 * explicit status-change actions (no-op saves are handled separately).
 */
export function isValidMilestoneStatusTransition(
  from: CaseMilestoneStatus,
  to: CaseMilestoneStatus,
): boolean {
  return canTransition(MILESTONE_TRANSITIONS, from, to);
}

/**
 * Terminal milestone outcomes have no forward transitions — only the reopen
 * edge back to Pending.
 */
export function isTerminalMilestoneStatus(status: CaseMilestoneStatus): boolean {
  return status === CaseMilestoneStatus.Done || status === CaseMilestoneStatus.Cancelled;
}

/**
 * Legal status options for the edit form: the current status plus every
 * valid target, so impossible moves are unselectable instead of errors.
 */
export function milestoneStatusOptions(from: CaseMilestoneStatus): CaseMilestoneStatus[] {
  return [from, ...(MILESTONE_TRANSITIONS[from] ?? [])];
}

/**
 * Describes what can legally happen next from a status so rejected
 * transitions can point the user at a valid move instead of a dead end.
 */
export function describeMilestoneNextSteps(from: CaseMilestoneStatus): string {
  if (isTerminalMilestoneStatus(from)) {
    return "reopen it";
  }
  return "mark it done or cancel it";
}
