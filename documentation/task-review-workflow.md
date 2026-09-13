# Task Review Workflow — Specification

## 1. Overview

Assignees do the work, reviewers approve it. A task moves `Pending → In Review → Done`. Rejection sends it back to `Pending` for rework. Task status is derived — no one sets it directly. Unwanted tasks are deleted, not cancelled.

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

No `Cancelled`. Delete the task if it is no longer needed.

### Per-Assignee (`TaskAssignment.status`)

| State  | Meaning                                 |
| ------ | --------------------------------------- |
| `Todo` | Still working                           |
| `Done` | Marked own work done (ready for review) |

Only the assignee can flip `Todo ⇄ Done` while the task is `Pending` or `InReview` (undo an accidental submit). Locked once `Done` at the task level.

### Per-Reviewer (`TaskReviewer.decision`)

| Decision   | Meaning           |
| ---------- | ----------------- |
| `Pending`  | Awaiting decision |
| `Approved` | Approves          |
| `Rejected` | Requests changes  |

Only reviewers can decide, and only while the task is `InReview`.

### Derivation (single pure function over the two arrays)

Priority: rejection → approval → submission → todo.

- Any `Rejected` → `Pending` (all decisions and all assignee states reset to `Todo`/`Pending`).
- Else if all reviewers `Approved` → `Done`.
- Else if all assignees `Done` (and at least one assignee) → `InReview`.
- Else → `Pending`.

Adding a reviewer to a `Done` task resets everything to `Pending` (reopen for new review). Editing assignees (delta sync) preserves existing states; new assignees start `Todo`.

```
 Creator creates task
        │
        ▼
      ┌─────────┐  all assignees Done   ┌──────────┐  all reviewers Approved  ┌──────┐
      │ Pending │ ─────────────────────→ │ InReview │ ───────────────────────→ │ Done │
      └─────────┘                        └────┬─────┘                          └──────┘
         ▲                                │  │
         └──── any Rejected (reset) ───────┘  └─ assignee undoes Done ─────→ Pending
                                               └─ reviewer added to Done ──→ Pending

Delete (creator, any status) → hard delete + documents purged. No cancelled state.
```

## 4. Permissions

No new RBAC permissions. Uses existing `task.*` matrix ([RBAC](./RBAC.md)):

| Person              | Facts                   | Access                 |
| ------------------- | ----------------------- | ---------------------- |
| Creator             | `own`                   | READ / UPDATE / DELETE |
| Assignee / reviewer | `assigned` + `taskOnly` | READ / UPDATE          |

- Approve / request changes = `task.update` decision write; optional comment = `note.create`.
- `Done` locks assignee flips and edits except delete.
- Delete is creator-only (`task.delete` + `own`).

## 5. Notifications

- Assignee or reviewer added → `TaskAssigned`
- `Pending → InReview`, `InReview → Done`, `InReview → Pending` (rejected) → `TaskStatusChanged`

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
- Assignee picker: creator-only, cross-disabled against reviewers. Reviewer picker: creator + reviewers.
- `StatusBadge` only — no status select. Status is derived.

### Column 2 — Files

`FileList` + `DropZone` in edit; read-only in view. Hidden in view when empty.

### Column 3 — Notes

Review comments are task `Note`s (`task_id`). `[+] Add Note` in edit opens `AddNoteModal`; view is read-only. Previous notes stay visible after rejection to guide rework.

### Workflow Controls (buttons, not selects)

- **Assignee:** `Mark done` / `Undo` toggle for own row (`Todo ⇄ Done`). Enabled only for own assignment while `Pending`/`InReview`.
- **Reviewer:** `Approve` / `Request changes` for own decision. Shown only when reviewer and `InReview`, and only until decided.
- **Creator:** `Delete task` (confirm) at any status — replaces the old status select. No `Pending`/`Cancelled` options.

All controls call server actions that re-derive status inside a `FOR UPDATE` transaction. Row actions in the table (View / Edit / Delete) are always rendered; server returns a toast if not allowed.

## 7. Data Model

`Task`, `TaskAssignment`, `TaskReviewer`, `Note`, `Document` plus enums `TaskStatus` (`Pending`/`InReview`/`Done`), `TaskAssignmentStatus` (`Todo`/`Done`), `ReviewDecision` (`Pending`/`Approved`/`Rejected`). See [Data Models](./models.md). `Task.status` is derived.

## 8. Audit

Every transition is a `task.update` (or `task.delete`) audited via `logAudit`. Notes are audited via `details`.
