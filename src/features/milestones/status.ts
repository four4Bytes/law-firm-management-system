import { CaseMilestoneStatus } from "@/generated/prisma/browser";
import { canTransition, MILESTONE_TRANSITIONS } from "@/lib/domain/lifecycle";

export const MILESTONE_STATUS_TRANSITIONS = MILESTONE_TRANSITIONS;

// A same-status move is never valid here; no-op saves are handled separately.
export function isValidMilestoneStatusTransition(
  from: CaseMilestoneStatus,
  to: CaseMilestoneStatus,
): boolean {
  return canTransition(MILESTONE_TRANSITIONS, from, to);
}

// `Done` and `Cancelled` have no forward edge except reopen back to `Pending`.
export function isTerminalMilestoneStatus(status: CaseMilestoneStatus): boolean {
  return status === CaseMilestoneStatus.Done || status === CaseMilestoneStatus.Cancelled;
}

// The edit form offers the current status plus every valid target, so an
// impossible move is unselectable rather than a server rejection.
export function milestoneStatusOptions(from: CaseMilestoneStatus): CaseMilestoneStatus[] {
  return [from, ...(MILESTONE_TRANSITIONS[from] ?? [])];
}

// Names the legal next move so a rejected transition can point somewhere valid
// instead of dead-ending the user.
export function describeMilestoneNextSteps(from: CaseMilestoneStatus): string {
  if (isTerminalMilestoneStatus(from)) {
    return "reopen it";
  }
  return "mark it done or cancel it";
}
