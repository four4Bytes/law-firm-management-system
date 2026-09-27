# Lifecycle — Specification

## 1. Two axes

Authorization has two independent axes, enforced in different layers:

| Axis | Question                                 | Source of truth               | Mirror doc        |
| ---- | ---------------------------------------- | ----------------------------- | ----------------- |
| Who  | May this user act?                       | `src/lib/security/rbac.ts`    | [RBAC](./RBAC.md) |
| When | Is the record in a legal state for this? | `src/lib/domain/lifecycle.ts` | This file         |

Never add status conditions to the RBAC matrix — it would multiply every cell and split lifecycle truth. Lifecycle predicates live next to the state machines they guard.

## 2. Transition tables

Single source of truth in `src/lib/domain/lifecycle.ts` (`CONSULTATION_TRANSITIONS`, `CASE_TRANSITIONS`, `MILESTONE_TRANSITIONS`); feature `status.ts` modules re-export them plus entity copy. Tasks have no transition table — status is derived (`deriveTaskStatus`), never set.

| Entity       | Table                                                                                       | Terminal meaning                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consultation | `Scheduled → Completed/Cancelled`; `Completed → Accepted/Rejected`; `Cancelled → Scheduled` | `Accepted`/`Rejected`: no outgoing edges (terminal). `Cancelled` rebooks.                                                                                                  |
| Case         | `Open → Closed/Settled/Terminated`; each terminal → `Open` (reopen)                         | No _outcome_ change; reopen is an explicit audited edge, never a rewrite.                                                                                                  |
| Task         | Derived (`Pending ⇄ InReview ⇄ Done`)                                                       | `Done`: terminal via derivation; reopened by the explicit reopen action.                                                                                                   |
| Milestone    | `Pending → Done/Cancelled`; each terminal → `Pending` (reopen)                              | Creation always `Pending` (no select; non-`Pending` refused server-side). Single writer (edit-form save); the select offers only legal targets. Reopen restarts reminders. |

Evaluators: `canTransition(table, from, to)` (same-status moves are never valid), `isTerminalStatus(table, status)` (derived — no outgoing edges).

## 3. Terminal status is not a write lock

Reaching a terminal status does **not** freeze a record's contents. Notes, files, and payments stay fully editable on a closed case, a concluded consultation, and a completed task. There is no append-only rule and no `isSubdataLocked` evaluator.

Record integrity is served by the audit trail, not by refusing writes: every note and document mutation writes an `AuditLog` row via `logAudit` (`src/features/audit/mutations.ts`), recording who changed what and when. Philippine matters also get reopened constantly — reconsideration, appeal, new petition, breached settlement — and freezing contents meant the lawyer could not write the note explaining why.

The reasoning, and the client-facing questions this raises, are in [Open questions](./open-questions.md).

## 4. Field locks

The only freezes in the system. Everything not listed stays editable in every status.

- **Consultation** — booking date changes only while `Scheduled`; all fields frozen once `Accepted` **and** linked to a case. An `Accepted` consultation with no linked case stays editable so it can be healed through the accept flow.
- **Case** — none.
- **Task** — the assignee/reviewer roster and the assignment/decision states while `Done`. The roster defines who the approvals apply to, so editing it would change their meaning; the states are what the derived status is computed from.

Each is enforced in its action and returns the `locked` envelope. Per-entity detail lives in the workflow documents below.

## 5. Shared UI

Status workflows share three primitives so every record behaves the same:

- `src/components/ui/WorkflowButtons/` — presentational icon buttons (`title` + `aria-label`, disabled while pending, renders `null` when empty). Features compute the button list from their matrix.
- `src/components/ui/DecisionModal/` — confirm dialog with optional reason field; takes a `reasonSchema` for validation. One component for consultation reject/cancel and case close/settle/terminate.
- `src/lib/useStatusWorkflow.ts` — pending flag plus `runWorkflowTask` / `applyChange` toast lifecycle for detail pages. Callers own routing and modal state.

## 6. Per-entity details

- [Consultation workflow](./consultation-workflow.md)
- [Case workflow](./case-workflow.md)
- [Task review workflow](./task-review-workflow.md)
- [Open questions](./open-questions.md)
