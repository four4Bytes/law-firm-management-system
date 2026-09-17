import { ConsultationStatus } from "@/generated/prisma/browser";

/** Terminal statuses that cannot be transitioned away from. */
export const TERMINAL_CONSULTATION_STATUSES = new Set<ConsultationStatus>([
  ConsultationStatus.Rejected,
  ConsultationStatus.Cancelled,
]);

/** Allowed transitions for each consultation status. */
export const CONSULTATION_STATUS_TRANSITIONS: Readonly<
  Record<ConsultationStatus, ConsultationStatus[]>
> = {
  [ConsultationStatus.Scheduled]: [ConsultationStatus.Completed, ConsultationStatus.Cancelled],
  [ConsultationStatus.Completed]: [ConsultationStatus.Accepted, ConsultationStatus.Rejected],
  [ConsultationStatus.Accepted]: [],
  [ConsultationStatus.Rejected]: [],
  [ConsultationStatus.Cancelled]: [],
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
