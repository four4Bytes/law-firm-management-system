import { ConsultationStatus } from "@/generated/prisma/browser";

/** Allowed transitions for each consultation status. */
export const CONSULTATION_STATUS_TRANSITIONS: Readonly<
  Record<ConsultationStatus, ConsultationStatus[]>
> = {
  [ConsultationStatus.Scheduled]: [ConsultationStatus.Completed, ConsultationStatus.Cancelled],
  [ConsultationStatus.Completed]: [ConsultationStatus.Accepted, ConsultationStatus.Rejected],
  [ConsultationStatus.Accepted]: [],
  [ConsultationStatus.Rejected]: [],
  [ConsultationStatus.Cancelled]: [ConsultationStatus.Scheduled],
};

/**
 * Determines whether a status transition is valid according to the consultation
 * state machine. A transition to the same status is not considered valid for
 * explicit status-change actions.
 */
export function isValidConsultationStatusTransition(
  from: ConsultationStatus,
  to: ConsultationStatus,
): boolean {
  return from !== to && CONSULTATION_STATUS_TRANSITIONS[from]?.includes(to) === true;
}

/**
 * Terminal statuses have no outgoing transitions. Derived from the matrix so
 * the two can never disagree.
 */
export function isTerminalStatus(status: ConsultationStatus): boolean {
  return (CONSULTATION_STATUS_TRANSITIONS[status] ?? []).length === 0;
}

/**
 * Describes what can legally happen next from a status so rejected
 * transitions can point the user at a valid move instead of a dead end.
 */
export function describeStatusNextSteps(from: ConsultationStatus): string {
  if (isTerminalStatus(from)) {
    return "nothing — this consultation is closed";
  }
  switch (from) {
    case ConsultationStatus.Scheduled:
      return "mark it completed or cancel it";
    case ConsultationStatus.Completed:
      return "accept it or reject it";
    default:
      return "rebook it";
  }
}
