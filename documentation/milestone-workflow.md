# Milestone Workflow - Specification

## 1. Overview

A milestone is sub-data of a case, not a standalone record. It moves `Pending → Done/Cancelled`, and any concluded milestone can be reopened back to `Pending`. Edits go through one server action (`updateMilestoneAction`) driven by the Edit modal - a single form covering title, description, due date, due time, and status. Milestones have no separate lifecycle document beyond this one and the shared [Lifecycle](./lifecycle.md) rules.

## 2. Roles

No workflow-specific roles. `milestone.update` on the record (assigned-or-own scope for a lawyer) edits every field including status. Creation and deletion use `milestone.create` / `milestone.delete`. See [RBAC](./RBAC.md).

## 3. Statuses

| Value       | Meaning                                           |
| ----------- | ------------------------------------------------- |
| `Pending`   | Work outstanding; the due date is a real deadline |
| `Done`      | Completed                                         |
| `Cancelled` | Dropped without completion                        |

### Transition matrix (single source of truth: `MILESTONE_TRANSITIONS` in `src/lib/domain/lifecycle.ts`, re-exported as `MILESTONE_STATUS_TRANSITIONS`)

| From        | To                  |
| ----------- | ------------------- |
| `Pending`   | `Done`, `Cancelled` |
| `Done`      | `Pending` (reopen)  |
| `Cancelled` | `Pending` (reopen)  |

Terminality (`isTerminalMilestoneStatus`) means "no outcome change", not "frozen forever" - per [lifecycle.md](./lifecycle.md) §3, a `Done` or `Cancelled` milestone keeps a fully editable title and description, and integrity comes from the audit trail. The one exception is the due date, which is date-locked like the consultation booking ([lifecycle.md](./lifecycle.md) §4, see §4.4 below). Same-status transitions are rejected, and a save that changes nothing returns early as a no-op.

The Edit modal's status select offers only the current status plus legal targets, so an impossible move is unselectable rather than a server rejection.

## 4. Due-date rules

The due date is a `DatePicker` plus a separate `TimeField`, combined into one instant with `combineDateTime`. Both sides of every comparison are floored to minute precision (`toMinuteEpoch`), on the client _and_ in the action, so a stored value carrying seconds can never read as changed. Read `Date` → picker conversion in the **app timezone** (`toCalendarDate` / `toTimeValue`), never the browser's, so an unedited save is a true no-op regardless of where the user is.

### 4.1 Date/status coherence

Two rules, enforced twice - inline on the field and again server-side as an `actionConflict`:

| Status      | Rule                                         |
| ----------- | -------------------------------------------- |
| `Pending`   | may not be due in the past                   |
| `Done`      | may not be due in the future                 |
| `Cancelled` | unconstrained - a past date is expected here |

Both are only evaluated when the due date **or** the status actually changed, so opening a legacy record that already violates a rule does not block an unrelated edit.

Because the rule couples two fields, it is surfaced on **both** of them: the `DatePicker` reports it against the date, and the `Status` select reports it against the status. A user who picks `Done` on a future-dated milestone sees the error under Status, where the offending choice was made, rather than only under a field they did not touch. The status `description` names the constraint in advance so the rejection is never a surprise.

**Reopening requires a date move too.** Moving a terminal milestone to `Pending` when its due date has already lapsed is refused - the milestone would otherwise sit permanently overdue. The fix is to advance the date in the same save, so the status select says so explicitly whenever `Pending` is selected and the current due date is in the past. This is the one place a transition is legal but not sufficient on its own.

### 4.2 Reschedule confirmation

Changing the due date asks for explicit confirmation showing old → new, mirroring the consultation reschedule flow ([consultation-workflow.md](./consultation-workflow.md)). The rationale is the side effect: a due-date change re-arms reminders and notifies every case assignee, and the copy names both consequences. Because of the lock in §4.4, a confirmed reschedule can only ever be a `Pending` milestone or a reopen, so the copy is always accurate.

The confirm fires only on a genuine change, per the minute-precision comparison above. The date rules are re-checked after the user confirms, so a record that lapsed while the modal sat open fails before the request rather than after it. React Aria native validation runs before the handler, so an invalid date never reaches the dialog.

### 4.3 No-op saves

The action short-circuits when nothing actually changed, and the modal disables Save until a real edit exists (`isDirty`). Without both, an unedited save would report "Milestone updated" while writing nothing.

### 4.4 Date-reschedule lock

The due date and time are editable only while the milestone is `Pending`, mirroring the consultation booking lock ([lifecycle.md](./lifecycle.md) §4). A concluded milestone is a settled commitment; moving its deadline re-notifies every case assignee and re-arms reminders for work nobody is waiting on. This is a **date** lock, not a content lock - title and description stay editable at every status.

Enforced on both sides:

- **Action** - `updateMilestoneAction` returns the `locked` envelope before the write when the date changed, the saved status is terminal, **and** the save is not reopening to `Pending`. The comparison floors both sides to the minute, matching the no-op check.
- **Modal** - the `DatePicker` and `TimeField` are disabled with a description naming the way out. Selecting `Pending` re-enables both immediately, so the reopen path is the visible route to a new deadline rather than a dead end.

The reopen exemption is load-bearing, not a convenience: per §4.1 a lapsed milestone cannot become `Pending` without moving the date forward, so a lock without the exemption would block the only legal way out of exactly the state most likely to need reopening.

## 5. Reopen semantics

Moving to `Pending` from a terminal status is a reopen. It resets reminder timing, so the status select describes it inline. Note this is a description, not a confirmation - unlike the task reopen, which confirms. That asymmetry is deliberate: reopening a task discards reviewer approvals, which is destructive to recorded decisions, whereas a milestone reopen only re-arms reminders (and, per §4.1, requires the due date to move forward).

## 6. Concurrency

`updateMilestoneAction` threads `expectedStatus` into the mutation, so a save that would overwrite a status another user changed first fails with `StatusConflictError` → the "Record changed" envelope rather than clobbering it. This matters more here than on other entities: status lives in the edit payload, and without the guard two editors both emit `MilestoneStatusChanged` and assignees receive contradictory notices. The same pattern guards `changeConsultationStatusAction`.

A milestone deleted between load and update raises `P2025`, which the action maps to `actionNotFound` instead of a generic failure - the modal is opened from a fetched row, so that window is wider than a same-render path.

## 7. Notifications

A due-date change dispatches `MilestoneDueDateChanged` to all case assignees (gated by `notify_email_milestone_rescheduled`) and resets reminder timing. Any status transition dispatches `MilestoneStatusChanged`. Creation, deletion, and content-only edits dispatch nothing. The actor is always excluded. See [notifications.md](./notifications.md).

The audit row is coarse by design: a status change records `Changed milestone status from <before> to <after>`, and any other edit records `Updated milestone: "<title>"` without naming which field moved.

## 8. Revalidation

Every milestone mutation revalidates both `/case/${caseId}` and `/case`. The list revalidation is required because the cases table renders a milestone-derived column (`latestMilestone`), so a title change made inside a case's Milestones tab would otherwise leave the cases list showing the old value until a manual reload.

## 9. Shared with other entities

- `src/lib/domain/lifecycle.ts` - `MILESTONE_TRANSITIONS` plus `canTransition` / `isTerminalStatus`.
- `src/features/milestones/status.ts` - re-exports the transition table with entity copy (`isValidMilestoneStatusTransition`, `describeMilestoneNextSteps`, `milestoneStatusOptions`).
- `src/components/ui/ConfirmDialog/` - the reschedule confirmation.
- [Dates & timezones](./dates-and-timezones.md) - why both sides of the due-date comparison floor to the minute, and the app-timezone rule that makes picker round-trips lossless.
