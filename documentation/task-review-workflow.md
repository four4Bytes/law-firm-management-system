# Task Review Workflow — Specification

## 1. Overview

A review chain system for tasks. Assignees complete work and submit it for review. Reviewers examine the work and decide to accept or reject. All reviewers must accept for the task to be considered complete.

## 2. Roles

| Role         | Definition                                     | Responsibilities                                                            |
| ------------ | ---------------------------------------------- | --------------------------------------------------------------------------- |
| **Creator**  | The user who created the task                  | Automatically a reviewer. Can add more reviewers via the reviewers Select.  |
| **Assignee** | A user assigned to the task                    | Performs the work, uploads files, submits for review, reworks on rejection. |
| **Reviewer** | The creator plus any user added by the creator | Reviews submitted work; records a decision via the Decision Select.         |

### Role Assignment Rules

- The task creator is always a reviewer and cannot be removed.
- Reviewers and assignees are edited through the multi-selects in `Edit Task`; whether a change is permitted is validated in the Server Action.
- **Auto-grant:** Every user attached to a task — assignee **or** reviewer — must be a member of the parent Case. Adding a user to a task who is not yet a case member automatically grants them read-only case membership (satisfying the `ASSIGNED` access fact). Case members retain their existing case-level permissions.
- All attached users gain task access through their task attachment (`TASK_ONLY`), subject to existing [RBAC](./RBAC.md) role rules.

## 3. Task Status Lifecycle

### Status Definitions

| Status      | Meaning                                                           |
| ----------- | ----------------------------------------------------------------- |
| `Pending`   | Not all assignees have submitted, or a reviewer rejected (rework) |
| `Submitted` | All assignees have submitted their work; under review             |
| `Completed` | All reviewers accepted                                            |
| `Cancelled` | Task is no longer relevant                                        |

### Assignee Submission State

Each assignee carries exactly one submission state per task (stored on `TaskAssignment`):

| State       | Meaning                                       |
| ----------- | --------------------------------------------- |
| `Pending`   | Assignee still working / reworking            |
| `Submitted` | Assignee has handed their work off for review |

An assignee may move **their own** row `Pending ⇄ Submitted` while the task is `Pending` or `Submitted` (corrects an accidental submit). The row is locked in `Completed` / `Cancelled`.

### Status Transitions

```
Creator creates task
       │
       ▼
    ┌─────────┐                             ┌───────────┐
    │ Pending │ ── All assignees submit ──> │ Submitted │
    └────┬────┘                             └────┬──────┘
         │                                       │
         │                              ┌────────┤
         │                              │        │
         │                              │        │
         │                    All reviewers      │ Any reviewer rejects
         │                    accept             │ (rework)
         │                              │        │
         │                              ▼        │
         │                       ┌───────────┐   │
         │                       │ Completed │   │
         │                       └───────────┘   │
         │                              ▲        │
         │                              └────────┘
         │
         │  (any active status)
         ▼
    ┌───────────┐
    │ Cancelled │
    └───────────┘
```

### Transition Rules

The task status is **fully derived** — assignees and reviewers never set it directly (only the creator may cancel). Derivation runs after every change (an assignee submits/reverts, a reviewer decides, or an attachment is added/removed):

- `Pending` → `Submitted`: derived when **every** assignee is `Submitted`.
- `Submitted` → `Completed`: derived when **every** reviewer is `Accepted`.
- `Submitted` → `Pending` (rework): derived when any reviewer `Rejected` (all reviewer decisions **and** all assignee submissions reset to `Pending`), **or** when any assignee reverts their own row to `Pending`.
- `Completed` → `Pending` (reopen): derived when a reviewer is added (defaults `Pending`); all reviewer decisions and assignee submissions reset to `Pending`.
- Any active status → `Pending` (manual reopen): **only the task creator** may reopen a task via the Edit Task Status Select (`Pending` option) — the Server Action permits it solely when the caller is the task's `created_by_user_id`. Reopening applies the standard rework reset: every reviewer decision and assignee submission returns to `Pending`. Reopening an already-`Pending` task is a no-op.
- Any active status → `Cancelled`: only the task **creator** may cancel — via the same Status Select (`Cancelled` option), permitted by the Server Action solely when the caller is the task's `created_by_user_id`; assignees and reviewers cannot. Cancellation is a status change (the record is retained), not a deletion, and cancelled tasks cannot be reopened.
- Editing the assignee list (creator only) applies a delta sync: added assignees start `Pending`, removed ones are dropped, and existing assignees retain their submission state.

## 4. Review Model

### Review Decision

Each reviewer has exactly one decision per task:

| Decision   | Meaning                                         |
| ---------- | ----------------------------------------------- |
| `Pending`  | Awaiting the reviewer's decision                |
| `Accepted` | Reviewer approves the work                      |
| `Rejected` | Reviewer rejects the work, assignee must rework |

### Reviewer Rules

- A user can only review a given task once. Re-adding the same reviewer resets their decision to `Pending` and clears `reviewed_at`.
- The task creator is always a reviewer from task creation.
- **Any reviewer (including the creator) may add new reviewers at any time** — while the task is `Pending`, `Submitted`, or `Completed`. This drives the review-chain pattern: the creator adds a reviewer, that reviewer adds another, and so on.
- When a reviewer is added, they receive a notification (see [notifications.md](./notifications.md)). The same `TaskAssigned` notification is sent when an **assignee** is added to a task.
- Each review decision may include an optional comment (a task Note) providing feedback.

### Status Derivation

The task status is **re-derived after every change** — a recorded reviewer decision, an assignee submitting/reverting, or an added/removed attachment — not only while `Submitted`:

- If **any** reviewer has `Rejected` → task returns to `Pending` (all reviewer decisions **and** all assignee submissions reset to `Pending`, `reviewed_at` cleared).
- If **all** reviewers have `Accepted` → task becomes `Completed`.
- Else if **all** assignees have `Submitted` (and at least one assignee exists) → task becomes `Submitted`.
- Otherwise → task remains `Pending`.

This is a single pure derivation over the two arrays `(assignee submission states, reviewer decisions)`; priority is rejection, then acceptance, then submission, then pending.

## 5. File & Detail Editing

Task files and details (title, description, files) are editable through the normal RBAC
`task.update` permission at any status except `Cancelled` (terminal — all edits forbidden).
The review workflow is driven solely by assignee submission states and reviewer decisions
(§3/§4); `Task.status` is fully derived and never directly edited by assignees or reviewers.

The only manual status controls — both creator-only via the Edit Task Status Select (§10.3) —
are cancellation and reopening, each permitted by the Server Action solely when the caller is
the task's `created_by_user_id`. Editing the assignee list remains creator-only (§10.1) and recreates
assignments, reopening the task (§3).

## 6. Comments and Feedback

Review comments are **task Notes** (the existing `Note` model, linked via `task_id`). A reviewer can add an optional comment in the Notes column of `Edit Task` via **[+] Add Note** — the same `AddNoteModal` used by the Notes tab. There is no comment field attached to the decision itself.

Review comments are visible to:

- All reviewers on the task
- All assignees on the task

When a task returns to `Pending` after rejection, previous review comments (notes) remain visible to guide rework.

## 7. Permissions

The review workflow introduces **no new RBAC permissions or access dimensions**. Reviewers are task-attached users, and the existing Task CRUD matrix in [RBAC](./RBAC.md) already covers them:

| Person                    | Access facts            | Task access (existing matrix) |
| ------------------------- | ----------------------- | ----------------------------- |
| Creator (first reviewer)  | `own`                   | READ / UPDATE / DELETE        |
| Added reviewer / assignee | `assigned` + `taskOnly` | READ / UPDATE                 |

- `taskOnly` (`TASK_ONLY`) means attached to the specific Task — as an assignee **or** a reviewer. Parent Case assignment alone is not enough.
- Accept / reject are expressed as task `UPDATE` (a decision write); the optional review comment is a task `Note` (`note.create`). Viewing submitted work is task `READ`.
- The only status-based restriction is the terminal `Cancelled` lock (all edits forbidden). Assignee-list editing is creator-only (see §10.1); all other task edits follow the normal RBAC `task.update` permission.

### Task Attachment Case Access

When any user is added to a task (as assignee or reviewer):

- If they are not already a member of the parent case, they are automatically granted read-only case membership (satisfying the `ASSIGNED` access fact) so they can view the case, the task, and its attachments.
- Their ability to perform actions within the case remains governed by their role in the RBAC matrix.

Without this auto-grant, `taskOnly` alone grants nothing — every qualifier using `TASK_ONLY` also requires `ASSIGNED`, so case membership is a prerequisite for task-level access to be meaningful.

## 8. Notifications

Review events dispatch through the standard notification pipeline (see [Notifications & Reminders](./notifications.md#4-event-driven-notifications-immediate)):

- Reviewer or assignee added → `TaskAssigned` (`taskAssignedTemplate`)
- Task submitted (→ `Submitted`) → `TaskStatusChanged` (`statusChangeTemplate`)
- Task completed (→ `Completed`) → `TaskStatusChanged` (`statusChangeTemplate`)
- Task rejected (→ `Pending`) → `TaskStatusChanged` (`statusChangeTemplate`)

Recipients, actor-exclusion rules, and message conventions are defined in the notifications spec.

## 9. Data Model

The data model is documented in [Data Models](./models.md). This workflow references the existing `Task`, `TaskReviewer`, `TaskAssignment`, `Note`, and `Document` models plus the `TaskStatus`, `ReviewDecision`, and `TaskAssignmentStatus` enums. `TaskAssignment.status` (`Pending` / `Submitted`) records each assignee's submission state; `Task.status` is **derived** (never set directly by assignees or reviewers) and is recomputed whenever an assignment or reviewer decision changes.

## 10. User Interface

### 10.1 Modal Model

There are exactly **three task modals**, and they look identical:

| Modal       | Purpose                                    | Columns | Buttons       |
| ----------- | ------------------------------------------ | ------- | ------------- |
| `Add Task`  | Create a new task within the case          | 2       | Cancel · Save |
| `Edit Task` | Edit an existing task + drive its workflow | 3       | Cancel · Save |
| `View Task` | Read-only inspection of a task             | 3       | Close         |

- The modals share the same column layout and field placement. `View Task` is `Edit Task` with every input rendered read-only (labels + values instead of inputs); it contains no workflow controls.
- **Assignee / Reviewer selects:**
  - **Assignee select is creator-only.** Only the task creator can change who is assigned.
  - **Reviewer select is editable by the creator _and_ any existing reviewer** (supporting the review-chain: a reviewer can add the next reviewer). Non-reviewer roles (plain assignees) and users with no task attachment see both as read-only **name chips** — they cannot alter attachments. Everything else in the modal is identical across roles.
- **All security is enforced in the Server Actions.** Row actions in the task table are always rendered (View / Edit / Delete). Clicking **Edit** when the caller lacks update permission shows a toast and does **not** open the modal. **View is rendered for every row**; if the caller lacks READ access, `getTaskDetailRowByIdAction` denies and the client shows a toast without opening the modal — the same rule as Edit/Delete.
- Workflow state is expressed through **plain form fields — Selects** — never through dedicated workflow buttons ("Submit for Review", "Cancel Task", "No decision panel", "No status banner").

### 10.2 Layout — View / Edit Task (3 columns)

```
┌──────────────────────────┬────────────────────────┬────────────────────────┐
│ 1. Task Info             │ 2. Files               │ 3. Notes               │
│                          │                        │                        │
│  Title                   │ DropZone               │ Review comments        │
│  Description             │ FileList (existing +   │   (list, truncated)    │
│  Assignees  [select + per-row submit]     │   new uploads)         │ [+] Add Note (Edit)    │
│  Reviewers  [select]     │                        │                        │
│  Status     [badge]     │                        │                        │
│  Decision   [select]     │                        │                        │
│  (Edit only, per role)   │                        │                        │
│                          │                        │                        │
└──────────────────────────┴────────────────────────┴────────────────────────┘
```

- **Column visibility differs between the two modals:** in `Edit Task` all three columns are always rendered (Column 2 carries the `DropZone` and Column 3 carries the `[+] Add Note` button, so neither is ever empty). In `View Task` a column is rendered **only if it has content** — an empty Files column (no documents) or an empty Notes column (no review comments) is omitted.
- **Column 1 — Task Info:** Title, Description, then Assignees and Reviewers rendered **as multi-selects for the creator only** — non-creators see read-only name chips — plus a derived Status badge (see [10.3](#103-status-and-submission)). The **Decision** select is rendered only for users who are reviewers on the task and only while the task is `Submitted` (see [10.4](#104-reviewer-decision-select)); otherwise it is omitted.
- **Column 2 — Files:** `FileList` (existing documents + entries for new uploads) and a `DropZone`. In `View Task` the upload controls are hidden and existing files are read-only (View file only, no delete). In `Edit Task` the column is always rendered; in `View Task` it is omitted when there are no documents.
- **Column 3 — Notes:** the task's review comments, listed newest first, truncated. In `Edit Task` a **`+` button** opens the same `AddNoteModal` used by the Notes tab (scoped to the task via `task_id`), which refreshes the list on success; the column is always rendered. In `View Task` the list is shown read-only (opening a note uses the Notes tab's shared `ViewNoteModal`) and the column is omitted when there are no review comments.
- **Add Task uses 2 columns** (Task Info + Files). There is no notes column because a note requires a parent task, which does not exist until the task is created.

### 10.3 Status and Submission

- **Task Status is derived and read-only.** It is shown as a `StatusBadge` (not a Select) for every role — assignees and reviewers never set it directly. It reflects the combined derivation in [§4](#status-derivation).
- **Assignee submission is per-row.** Each assignee sees their own row in the Assignees list with a `Submit` Select (`Pending` / `Submitted`), editable **only by that assignee**. Submitting flips their row; when the last assignee submits, the task derives to `Submitted`. An assignee may revert `Submitted → Pending` while the task is `Pending` or `Submitted` (to fix an accidental submit); the row is locked in `Completed` / `Cancelled`.
- **Reviewer decision** (`Accepted` / `Rejected`) is unchanged (see [10.4](#104-reviewer-decision-select)); the status re-derives automatically.
- **Status Select (creator-only manual control).** The task **creator** gets a single Status Select in `Edit Task` with two options — `Pending` and `Cancelled` — plus a neutral placeholder ("Keep current status"). Choosing `Cancelled` cancels the task (§3); choosing `Pending` manually reopens it with the full rework reset (all reviewer decisions and assignee submissions return to `Pending`). Non-creators see no such control. The Server Action (`setTaskStatusAction`) permits both transitions solely when the caller is the task's `created_by_user_id`; reopening is a no-op on an already-`Pending` task, and both are rejected on a cancelled (terminal) task.
- Editing the assignee list (creator only) recreates assignments and resets all submission states to `Pending` (rework), reopening the task.
- The server remains authoritative: every transition is validated and re-derived in the Server Actions; the selects are UX affordances only.

### 10.4 Reviewer Decision Select

- A reviewer drives the workflow the same way an assignee does — a single select and Save. For a reviewer that select is their **own Decision** (`Accepted` / `Rejected`), rendered in `Edit Task` only when they are a reviewer on the task and the task is `Submitted`. `Pending` remains the pre-decision default state and is not a selectable value.
- Saving records the reviewer's decision (`TaskReviewer.decision` + `reviewed_at`) and re-derives the task status: all accepted → `Completed`, any rejected → `Pending` with all decisions reset.
- The decision may be accompanied by an optional review comment entered in the Notes column. The reviewer writes the comment via **[+] Add Note**.

## 11. Audit Trail

All review actions are task `UPDATE` mutations, audited automatically via `logAudit` (immutable, read-only access — see [Audit Logging](./security.md#audit-logging)). Review comments are captured in the audit `details`.
