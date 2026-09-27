/**
 * Central lifecycle policy: every "when" question in one place.
 *
 * RBAC (`src/lib/rbac.ts`) answers *who may act on what*. This module answers
 * *when an action is legal given record state*: status transitions and
 * terminality. Server actions consult these predicates instead of hand-rolling
 * status checks, and `documentation/lifecycle.md` mirrors the tables below.
 *
 * Terminal status is deliberately **not** a content lock. There is no
 * `isSubdataLocked` here, and there should not be one: record integrity is
 * served by the audit trail, not by refusing writes. The only content freezes
 * in the system are the field locks in `documentation/lifecycle.md` §4, which
 * live next to the state machines they guard. See that document before adding
 * a status-dependent write restriction here.
 *
 * @module lib/lifecycle
 */

import { CaseMilestoneStatus, CaseStatus, ConsultationStatus } from "@/generated/prisma/browser";

/** Transition table: every legal move out of each status. */
export type TransitionTable<S extends string> = Readonly<Record<S, readonly S[]>>;

/** Consultation lifecycle: assess, then decide; cancelled bookings can rebook. */
export const CONSULTATION_TRANSITIONS: TransitionTable<ConsultationStatus> = {
  [ConsultationStatus.Scheduled]: [ConsultationStatus.Completed, ConsultationStatus.Cancelled],
  [ConsultationStatus.Completed]: [ConsultationStatus.Accepted, ConsultationStatus.Rejected],
  [ConsultationStatus.Accepted]: [],
  [ConsultationStatus.Rejected]: [],
  [ConsultationStatus.Cancelled]: [ConsultationStatus.Scheduled],
};

/** Case lifecycle: open matters conclude; concluded matters can reopen. */
export const CASE_TRANSITIONS: TransitionTable<CaseStatus> = {
  [CaseStatus.Open]: [CaseStatus.Closed, CaseStatus.Settled, CaseStatus.Terminated],
  [CaseStatus.Closed]: [CaseStatus.Open],
  [CaseStatus.Settled]: [CaseStatus.Open],
  [CaseStatus.Terminated]: [CaseStatus.Open],
};

/** Milestone lifecycle: pending work concludes; concluded work can reopen. */
export const MILESTONE_TRANSITIONS: TransitionTable<CaseMilestoneStatus> = {
  [CaseMilestoneStatus.Pending]: [CaseMilestoneStatus.Done, CaseMilestoneStatus.Cancelled],
  [CaseMilestoneStatus.Done]: [CaseMilestoneStatus.Pending],
  [CaseMilestoneStatus.Cancelled]: [CaseMilestoneStatus.Pending],
};

/**
 * Determines whether a status transition is legal. A transition to the same
 * status is never valid for explicit status-change actions.
 *
 * @param table - The entity's transition table.
 * @param from - Current status.
 * @param to - Requested status.
 * @returns True when the move is an edge in the table.
 */
export function canTransition<S extends string>(
  table: TransitionTable<S>,
  from: S,
  to: S,
): boolean {
  return from !== to && table[from]?.includes(to) === true;
}

/**
 * Terminal statuses have no forward transitions. Derived from the table so
 * the two can never disagree.
 *
 * @param table - The entity's transition table.
 * @param status - Status to test.
 * @returns True when nothing leaves this status.
 */
export function isTerminalStatus<S extends string>(table: TransitionTable<S>, status: S): boolean {
  return (table[status] ?? []).length === 0;
}
