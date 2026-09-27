import { CaseStatus } from "@/generated/prisma/browser";
import { canTransition, CASE_TRANSITIONS } from "@/lib/domain/lifecycle";

export const CASE_STATUS_TRANSITIONS = CASE_TRANSITIONS;

// A same-status move is never valid here; no-op saves are handled separately.
export function isValidCaseStatusTransition(from: CaseStatus, to: CaseStatus): boolean {
  return canTransition(CASE_TRANSITIONS, from, to);
}

// Terminal means no forward edge except reopen — resumed litigation stays on the
// same matter record (same court, docket, client, fees, documents) rather than
// fragmenting across two. Every reopen is an explicit, confirmed, audited edge.
export function isTerminalCaseStatus(status: CaseStatus): boolean {
  return (
    status === CaseStatus.Closed ||
    status === CaseStatus.Settled ||
    status === CaseStatus.Terminated
  );
}

// Names the legal next move so a rejected transition can point somewhere valid
// instead of dead-ending the user.
export function describeCaseNextSteps(from: CaseStatus): string {
  if (isTerminalCaseStatus(from)) {
    return "reopen it";
  }
  return "close it, settle it, or terminate it";
}
