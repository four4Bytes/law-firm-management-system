/**
 * Central lifecycle policy: every "when" question in one place.
 *
 * RBAC (`src/lib/rbac.ts`) answers *who may act on what*. This module answers
 * *when an action is legal given record state*: status transitions,
 * terminality, and append-only locks on terminal records. Server actions
 * consult these predicates instead of hand-rolling status checks, and
 * `documentation/lifecycle.md` mirrors the tables below.
 *
 * @module lib/lifecycle
 */

import {
  CaseMilestoneStatus,
  CaseStatus,
  ConsultationStatus,
  TaskStatus,
} from "@/generated/prisma/browser";

/** Entities with a status lifecycle. */
export type LifecycleEntity = "consultation" | "case" | "task";

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

/**
 * Consultation statuses whose notes and files are append-only. Note this is
 * not the terminal set: Cancelled can rebook, but while cancelled the record
 * is still locked (rebooking restores editing automatically).
 */
const SUBDATA_LOCKED_CONSULTATION_STATUSES: ReadonlySet<string> = new Set([
  ConsultationStatus.Accepted,
  ConsultationStatus.Rejected,
  ConsultationStatus.Cancelled,
]);

/** Case statuses whose notes and files are append-only. */
const SUBDATA_LOCKED_CASE_STATUSES: ReadonlySet<string> = new Set([
  CaseStatus.Closed,
  CaseStatus.Settled,
  CaseStatus.Terminated,
]);

/**
 * Determines whether an entity's notes and files are append-only: new
 * entries welcome, existing ones refuse update and delete. The lock follows
 * current status, so rebooking or reopening restores editing automatically.
 * Reads, uploads, and payments are never locked by this predicate.
 *
 * @param entity - Which lifecycle to consult.
 * @param status - The record's current status.
 * @returns True when existing notes/files must refuse mutation.
 */
export function isSubdataLocked(entity: LifecycleEntity, status: string): boolean {
  switch (entity) {
    case "consultation":
      return SUBDATA_LOCKED_CONSULTATION_STATUSES.has(status);
    case "case":
      return SUBDATA_LOCKED_CASE_STATUSES.has(status);
    case "task":
      return status === TaskStatus.Done;
  }
}
