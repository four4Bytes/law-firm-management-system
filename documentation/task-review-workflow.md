# Task Review Workflow — Specification

## 1. Overview

Assignees do the work, reviewers approve it. A task moves `Pending → In Review → Done`. Rejection sends it back to `Pending` for rework. Task status is derived — no one sets it directly. Unwanted tasks are deleted, not cancelled.

`Done` is a **workflow** state, not a content freeze. While a task is `Done` the assignee roster, the reviewer roster, and every assignment/decision state are frozen, because changing them would change what "all approved" means. Title, description, notes, and files stay fully editable, and the task can be deleted — the same as in any other status. Reopening is an explicit action, not a side effect of the reviewer picker. See [Lifecycle](./lifecycle.md) §3 for why terminal status does not lock content.

## 2. Roles

| Role         | Definition                                      | Responsibilities                                                                      |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Creator**  | Created the task                                | Always a reviewer, cannot be removed. Adds assignees and reviewers. Deletes the task. |
| **Assignee** | Assigned to do the work                         | Uploads files, marks own work done/undo.                                              |
| **Reviewer** | Creator + anyone the creator or a reviewer adds | Approves or requests changes when the task is in review.                              |

### Assignment Rules

- Creator is always a reviewer.
- Assignee list is creator-only. Reviewer list is creator + any reviewer (review chain).
- Adding a user to a task auto-grants read-only case membership if needed (`ASSIGNED` fact). Task access also requires `TASK_ONLY` (see [RBAC](./RBAC.md)).
- Assignees ≠ reviewers — enforced by server (`Assignee and reviewer must be distinct`).

## 3. Statuses

### Task (`Task.status`)

| Status     | Meaning                                                     |
| ---------- | ----------------------------------------------------------- |
| `Pending`  | Work not yet ready for review (default, or after rejection) |
| `InReview` | Every assignee marked done — awaiting reviewer decisions    |
| `Done`     | Every reviewer approved                                     |

No `Cancelled`. Delete the task if it is no longer needed. Reopen it if the work is genuinely being redone.

### Per-Assignee (`TaskAssignment.status`)

| State  | Meaning                                 |
| ------ | --------------------------------------- |
| `Todo` | Still working                           |
| `Done` | Marked own work done (ready for review) |

Only the assignee can flip `Todo ⇄ Done` while the task is `Pending` or `InReview` (undo an accidental submit). Frozen once `Done` at the task level, because flipping an assignment would re-derive the status out from under the approvals.

### Per-Reviewer (`TaskReviewer.decision`)

| Decision   | Meaning           |
| ---------- | ----------------- |
| `Pending`  | Awaiting decision |
| `Approved` | Approves          |
| `Rejected` | Requests changes  |

Only reviewers can decide, and only while the task is `InReview`. Frozen while `Done` for the same reason as assignments.

### Derivation (single pure function over the two arrays)

Priority: rejection → approval → submission → todo.

- Any `Rejected` → `Pending` (all decisions and all assignee states reset to `Todo`/`Pending`).
- Else if all reviewers `Approved` → `Done`.
- Else if all assignees `Done` (and at least one assignee) → `InReview`.
- Else → `Pending`.

Decisions are only writable while `InReview` (`applyReviewDecision` refuses otherwise) and assignment flips are refused outright while `Done` (`setAssignmentStatus` throws `TaskLockedError`). Both guards are required: flipping one assignment on a `Done` task would re-derive the status straight back out of `Done` without anyone reviewing it. Content needs no guard — see §1.

### Reopen (`Done → Pending`)

Reopening is a single explicit action (`reopenTaskAction`), available to the creator and to any reviewer, at any time while the task is `Done`. It runs one transaction under a `FOR UPDATE` row lock and resets:

- every `TaskReviewer.decision` → `Pending`, clearing `reviewed_at`
- every `TaskAssignment.status` → `Todo`

The assignee's own work is deliberately not preserved: stale `Done` marks would re-derive the task straight back to `Done` with nobody having looked at it. The confirm dialog states both resets.

Reopening is audited as `task.reopened` — the status move and both resets in one entry — and notifies assignees. It is deliberately not modelled as "add a reviewer" — that made unlocking the task depend on fabricating a real reviewer obligation, and was discoverable only from a banner. `addTaskReviewer` therefore refuses a `Done` task like any other roster change.

```
 Creator creates task
         │
         ▼
       ┌─────────┐  all assignees Done   ┌──────────┐  all reviewers Approved  ┌──────┐
       │ Pending │ ─────────────────────→ │ InReview │ ───────────────────────→ │ Done │
       └─────────┘                        └────┬─────┘                          └──────┘
          ▲                                │  │
          └──── any Rejected (reset) ───────┘  └─ assignee undoes Done ─────→ Pending
                                                └─ reviewer requests changes ─→ Pending

      Done ── explicit reopen ──▶ Pending    (resets all reviewer approvals to Pending
                                             and all assignment marks to Todo)

Delete (creator, any status) → hard delete + documents purged. No cancelled state.
```

## 4. Permissions

No new RBAC permissions. Uses existing `task.*` matrix ([RBAC](./RBAC.md)):

| Person              | Facts                   | Access                 |
| ------------------- | ----------------------- | ---------------------- |
| Creator             | `own`                   | READ / UPDATE / DELETE |
| Assignee / reviewer | `assigned` + `taskOnly` | READ / UPDATE          |

- Approve / request changes = `task.update` decision write; optional comment = `note.create`.
- Reopen = `task.update` on the record, restricted to the creator and existing reviewers.
- Delete is creator-only (`task.delete` + `own`).

### What `Done` freezes

| Operation while `Done`               | Behaviour | Enforced by                                              |
| ------------------------------------ | --------- | -------------------------------------------------------- |
| Edit title / description             | allowed   | —                                                        |
| Add, edit, or delete notes and files | allowed   | —                                                        |
| Edit assignee or reviewer roster     | refused   | `updateTask` / `addTaskReviewer` throw `TaskLockedError` |
| Flip an assignment `Todo ⇄ Done`     | refused   | `setAssignmentStatus` throws `TaskLockedError`           |
| Approve / request changes            | refused   | `applyReviewDecision` requires `InReview`                |
| Reopen                               | allowed   | —                                                        |
| Delete                               | allowed   | Creator-only                                             |

The roster and assignment refusals return the `locked` envelope, whose copy names the reopen path. Both also disable the control client-side (`canEditRoster`, `canToggleOwnSubmission`), so the envelope normally only surfaces when someone else changed the task while the modal was open. Reviewing a task that is not `InReview` returns a plain `conflict` instead — that is a state gate, not the freeze.

## 5. Notifications

- Assignee or reviewer added → `TaskAssigned`
- `Pending → InReview`, `InReview → Done`, `InReview → Pending` (rejected), `Done → Pending` (reopened) → `TaskStatusChanged`

See [Notifications](./notifications.md).

## 6. UI

### Modals

| Modal       | Columns                  | Actions         |
| ----------- | ------------------------ | --------------- |
| `Add Task`  | 2 (Info + Files)         | Cancel · Create |
| `Edit Task` | 3 (Info + Files + Notes) | Cancel · Save   |
| `View Task` | 3 (read-only)            | Close           |

`Add Task` has no notes column (task does not exist yet).

### Column 1 — Task Info

- Title, description, assignees (`UserList` with `Todo`/`Done` chips), reviewers (`UserList` with `Pending`/`Approved`/`Rejected`).
- Assignee picker: creator-only, cross-disabled against reviewers. Reviewer picker: creator + reviewers. Both are disabled while `Done`, with a note explaining that the roster determines who approved the task and that reopening is the way out.
- Title and description remain editable while `Done`.
- `StatusBadge` only — no status select. Status is derived.

### Column 2 — Files

`FileList` + `DropZone` in edit; read-only in view. Hidden in view when empty. Editable while `Done` — a completed task still accepts follow-up attachments.

### Column 3 — Notes

Review comments are task `Note`s (`task_id`). `[+] Add Note` in edit opens `AddNoteModal`; view is read-only. Previous notes stay visible after rejection to guide rework. Editable while `Done`.

### Workflow Controls (buttons, not selects)

- **Assignee:** `Mark done` / `Undo` toggle for own row (`Todo ⇄ Done`). Disabled unless it is the caller's own assignment and the task is not `Done`.
- **Reviewer:** `Approve` / `Request changes` for own decision. Shown to reviewers, disabled unless `InReview` and until decided.
- **Reviewer or creator:** `Reopen task` (confirm), shown only while `Done`. The confirm states both resets.
- **Creator:** `Delete task` (confirm) at any status — replaces the old status select. No `Pending`/`Cancelled` options.

All controls call server actions that re-derive status inside a `FOR UPDATE` transaction. Row actions in the table (View / Edit / Delete) are always rendered; server returns a toast if not allowed.

## 7. Data Model

`Task`, `TaskAssignment`, `TaskReviewer`, `Note`, `Document` plus enums `TaskStatus` (`Pending`/`InReview`/`Done`), `TaskAssignmentStatus` (`Todo`/`Done`), `ReviewDecision` (`Pending`/`Approved`/`Rejected`). See [Data Models](./models.md). `Task.status` is derived.

## 8. Audit

`task.created` / `task.updated` / `task.submitted` / `task.reviewed` / `task.reopened` /
`task.status_changed` / `task.deleted`.

`Task.status` is derived, so it has no writer of its own — the audit trail would otherwise never show
it move. Submit, review, and roster change route through one helper that writes `task.status_changed`
with `from X to Y` **only when the status actually moved**; a review that leaves the task `InReview`
(one reviewer approving while another is still `Pending`) logs the decision and nothing more. Reopen
records its move inside its `task.reopened` details instead, because the resets and the status change
are one event.

Note create/update/delete record a truncated content preview alongside the note id.
