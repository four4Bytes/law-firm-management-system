import { ConsultationStatus } from "@/generated/prisma/browser";
import { canTransition, CONSULTATION_TRANSITIONS, isTerminalStatus } from "@/lib/lifecycle";

/** Allowed transitions for each consultation status. */
export const CONSULTATION_STATUS_TRANSITIONS = CONSULTATION_TRANSITIONS;

/**
 * Determines whether a status transition is valid according to the consultation
 * state machine. A transition to the same status is not considered valid for
 * explicit status-change actions.
 */
export function isValidConsultationStatusTransition(
  from: ConsultationStatus,
  to: ConsultationStatus,
): boolean {
  return canTransition(CONSULTATION_TRANSITIONS, from, to);
}

/**
 * Terminal statuses have no outgoing transitions. Derived from the matrix so
 * the two can never disagree.
 */
export function isTerminalConsultationStatus(status: ConsultationStatus): boolean {
  return isTerminalStatus(CONSULTATION_TRANSITIONS, status);
}

/**
 * Describes what can legally happen next from a status so rejected
 * transitions can point the user at a valid move instead of a dead end.
 * Terminal statuses (per the matrix) have no moves; of the live statuses,
 * Scheduled and Completed have named moves and Cancelled rebooks.
 */
export function describeConsultationNextSteps(from: ConsultationStatus): string {
  if (isTerminalConsultationStatus(from)) {
    return "nothing — this consultation is closed";
  }
  return from === ConsultationStatus.Scheduled
    ? "mark it completed or cancel it"
    : from === ConsultationStatus.Completed
      ? "accept it or reject it"
      : "rebook it";
}
