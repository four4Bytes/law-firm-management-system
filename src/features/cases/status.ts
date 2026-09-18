import { CaseStatus } from "@/generated/prisma/browser";

/** Allowed transitions for each case status. */
export const CASE_STATUS_TRANSITIONS: Readonly<Record<CaseStatus, CaseStatus[]>> = {
  [CaseStatus.Open]: [CaseStatus.Closed, CaseStatus.Settled, CaseStatus.Terminated],
  [CaseStatus.Closed]: [CaseStatus.Open],
  [CaseStatus.Settled]: [CaseStatus.Open],
  [CaseStatus.Terminated]: [CaseStatus.Open],
};

/**
 * Determines whether a status transition is valid according to the case
 * state machine. A transition to the same status is not considered valid for
 * explicit status-change actions.
 */
export function isValidCaseStatusTransition(from: CaseStatus, to: CaseStatus): boolean {
  return from !== to && CASE_STATUS_TRANSITIONS[from]?.includes(to) === true;
}

/**
 * Terminal statuses have no forward transitions. They can only be reopened
 * back to Open — resumed litigation stays on the same matter record (same
 * court, docket, client, fees, documents) instead of fragmenting across two
 * records. Every reopen is an explicit, confirmed, audited transition.
 */
export function isTerminalCaseStatus(status: CaseStatus): boolean {
  return (
    status === CaseStatus.Closed ||
    status === CaseStatus.Settled ||
    status === CaseStatus.Terminated
  );
}

/**
 * Describes what can legally happen next from a status so rejected
 * transitions can point the user at a valid move instead of a dead end.
 */
export function describeCaseNextSteps(from: CaseStatus): string {
  if (isTerminalCaseStatus(from)) {
    return "reopen it";
  }
  return "close it, settle it, or terminate it";
}
