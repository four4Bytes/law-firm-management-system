# Lifecycle — Specification

## 1. Two axes

Authorization has two independent axes, enforced in different layers:

| Axis | Question                                 | Source of truth        | Mirror doc        |
| ---- | ---------------------------------------- | ---------------------- | ----------------- |
| Who  | May this user act?                       | `src/lib/rbac.ts`      | [RBAC](./RBAC.md) |
| When | Is the record in a legal state for this? | `src/lib/lifecycle.ts` | This file         |

Never add status conditions to the RBAC matrix — it would multiply every cell and split lifecycle truth. Lifecycle predicates live next to the state machines they guard.

## 2. Transition tables

Single source of truth in `src/lib/lifecycle.ts` (`CONSULTATION_TRANSITIONS`, `CASE_TRANSITIONS`, `MILESTONE_TRANSITIONS`); feature `status.ts` modules re-export them plus entity copy. Tasks have no transition table — status is derived (`deriveTaskStatus`), never set.

| Entity       | Table                                                                                       | Terminal meaning                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consultation | `Scheduled → Completed/Cancelled`; `Completed → Accepted/Rejected`; `Cancelled → Scheduled` | `Accepted`/`Rejected`: no outgoing edges (terminal). `Cancelled` rebooks.                                                                                                  |
| Case         | `Open → Closed/Settled/Terminated`; each terminal → `Open` (reopen)                         | No _outcome_ change; reopen is an explicit audited edge, never a rewrite.                                                                                                  |
| Task         | Derived (`Pending ⇄ InReview ⇄ Done`)                                                       | `Done`: terminal via derivation; reopened by adding a reviewer.                                                                                                            |
| Milestone    | `Pending → Done/Cancelled`; each terminal → `Pending` (reopen)                              | Creation always `Pending` (no select; non-`Pending` refused server-side). Single writer (edit-form save); the select offers only legal targets. Reopen restarts reminders. |

Evaluators: `canTransition(table, from, to)` (same-status moves are never valid), `isTerminalStatus(table, status)` (derived — no outgoing edges).

## 3. Append-only locks

`isSubdataLocked(entity, status)` decides whether existing notes/files refuse update/delete. Locked sets:

| Entity       | Locked statuses                     |
| ------------ | ----------------------------------- |
| Consultation | `Accepted`, `Rejected`, `Cancelled` |
| Case         | `Closed`, `Settled`, `Terminated`   |
| Task         | `Done`                              |

The lock follows _current_ status: rebooking (`Cancelled → Scheduled`) or reopening restores editing automatically. Never locked: reads, note/file creation, payments (refunds must stay recordable), cascade purges on record deletion (system path, not user edits).

Violations throw `RecordLockedError(entity)` (tasks keep `TaskLockedError`), mapped by `toActionResponse` to the `locked` envelope (`actionRecordLocked`). Buttons stay rendered; the toast explains the add-only rule.

## 4. Field locks (entity-specific, enforced in actions)

- Consultation: booking changes only while `Scheduled`; all fields frozen when `Accepted` with a linked case.
- Case: no field locks (status travels only through `changeCaseStatusAction`).
- Task: metadata frozen when `Done` (except reopening via reviewer add).

## 5. Shared UI

Status workflows share three primitives so every record behaves the same:

- `src/components/ui/WorkflowButtons/` — presentational icon buttons (`title` + `aria-label`, disabled while pending, renders `null` when empty). Features compute the button list from their matrix.
- `src/components/ui/DecisionModal/` — confirm dialog with optional reason field; takes a `reasonSchema` for validation. One component for consultation reject/cancel and case close/settle/terminate.
- `src/lib/useStatusWorkflow.ts` — pending flag plus `runWorkflowTask` / `applyChange` toast lifecycle for detail pages. Callers own routing and modal state.

## 6. Per-entity details

- [Consultation workflow](./consultation-workflow.md) (matrix, accept flow, reschedule rules, decision reasons)
- [Case workflow](./case-workflow.md) (matrix, closing flow, reopen rules)
- [Task review workflow](./task-review-workflow.md) (derivation, review chain, reopen)
