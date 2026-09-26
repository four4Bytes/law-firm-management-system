import { ConsultationStatus } from "@/generated/prisma/browser";
import { canTransition, CONSULTATION_TRANSITIONS, isTerminalStatus } from "@/lib/domain/lifecycle";

export const CONSULTATION_STATUS_TRANSITIONS = CONSULTATION_TRANSITIONS;

// A same-status move is never valid here; no-op saves are handled separately.
export function isValidConsultationStatusTransition(
  from: ConsultationStatus,
  to: ConsultationStatus,
): boolean {
  return canTransition(CONSULTATION_TRANSITIONS, from, to);
}

// Derived from the matrix rather than restated, so the two cannot disagree.
export function isTerminalConsultationStatus(status: ConsultationStatus): boolean {
  return isTerminalStatus(CONSULTATION_TRANSITIONS, status);
}

// Names the legal next move so a rejected transition can point somewhere valid
// instead of dead-ending the user. Terminal statuses have no moves; of the live
// ones Scheduled and Completed have named moves and Cancelled rebooks.
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
