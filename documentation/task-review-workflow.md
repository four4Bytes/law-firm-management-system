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

| Status      | Meaning                                            |
| ----------- | -------------------------------------------------- |
| `Pending`   | Created, in progress, or reworking after rejection |
| `Submitted` | Work submitted, under review                       |
| `Completed` | All reviewers accepted                             |
| `Cancelled` | Task is no longer relevant                         |

### Status Transitions

```
Creator creates task
       │
       ▼
    ┌─────────┐                             ┌───────────┐
    │ Pending │ ───── Assignee submits ───► │ Submitted │
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

- `Pending` → `Submitted`: Assignee submits their work for review.
- `Submitted` → `Completed`: Every reviewer has accepted.
- `Submitted` → `Pending`: Any reviewer rejects. All reviewer decisions reset to pending (rework).
- Any active status → `Cancelled`: Task is abandoned. Only the task **creator** may cancel — the Server Action permits it solely when the caller is the task's `created_by_user_id`; assignees and reviewers cannot. Cancellation is a status change (the record is retained), not a deletion.

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
- When a reviewer is added, they receive a notification (see [notifications.md](./notifications.md)).
- Each review decision may include an optional comment (a task Note) providing feedback.

### Status Derivation

The task status is **re-derived after every reviewer change** — a recorded decision _or_ an added reviewer — not only while `Submitted`:

- If **any** reviewer has `Rejected` → task returns to `Pending` (all decisions reset to `Pending`, `reviewed_at` cleared).
- If **all** reviewers have `Accepted` → task becomes `Completed`.
- Otherwise (at least one reviewer is still `Pending`):
  - If a reviewer was just added to a `Completed` task → task returns to `Pending` (the new reviewer is `Pending` by default, reopening the review).
  - Otherwise → task remains `Submitted`.

## 5. File Locking

When a task is in `Submitted` status:

- Assignees cannot upload new files.
- Assignees cannot delete existing files.
- Assignees cannot edit task details (title, description, assignees, reviewers).
- Reviewers can view all files and task details (read-only) and record their decision via the Decision Select.

When the task returns to `Pending` (after rejection), file editing is restored.

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
- Status-based restrictions (assignees cannot edit while `Submitted`, files locked during review) are enforced in the actions layer, not the RBAC matrix — consistent with existing task status rules.

### Task Attachment Case Access

When any user is added to a task (as assignee or reviewer):

- If they are not already a member of the parent case, they are automatically granted read-only case membership (satisfying the `ASSIGNED` access fact) so they can view the case, the task, and its attachments.
- Their ability to perform actions within the case remains governed by their role in the RBAC matrix.

Without this auto-grant, `taskOnly` alone grants nothing — every qualifier using `TASK_ONLY` also requires `ASSIGNED`, so case membership is a prerequisite for task-level access to be meaningful.

## 8. Notifications

Review events dispatch through the standard notification pipeline (see [Notifications & Reminders](./notifications.md#4-event-driven-notifications-immediate)):

- Reviewer added → `TaskAssigned` (`taskAssignedTemplate`)
- Task submitted (→ `Submitted`) → `TaskStatusChanged` (`statusChangeTemplate`)
- Task completed (→ `Completed`) → `TaskStatusChanged` (`statusChangeTemplate`)
- Task rejected (→ `Pending`) → `TaskStatusChanged` (`statusChangeTemplate`)

Recipients, actor-exclusion rules, and message conventions are defined in the notifications spec.

## 9. Data Model

The data model for tasks and reviewers is documented in [Data Models](./models.md). This workflow references the existing `Task`, `TaskReviewer`, `Note`, and `Document` models plus the `TaskStatus` and `ReviewDecision` enums.

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
- **All security is enforced in the Server Actions.** Row actions in the task table are always rendered (View / Edit / Delete). Clicking **Edit** when the caller lacks update permission shows a toast and does **not** open the modal. View is the single exception: it is hidden when the caller has no READ access (AGENTS.md:94).
- Workflow state is expressed through **plain form fields — Selects** — never through dedicated workflow buttons ("Submit for Review", "Cancel Task", "No decision panel", "No status banner").

### 10.2 Layout — View / Edit Task (3 columns)

```
┌──────────────────────────┬────────────────────────┬────────────────────────┐
│ 1. Task Info             │ 2. Files               │ 3. Notes               │
│                          │                        │                        │
│  Title                   │ DropZone               │ Review comments        │
│  Description             │ FileList (existing +   │   (list, truncated)    │
│  Assignees  [select]     │   new uploads)         │ [+] Add Note (Edit)    │
│  Reviewers  [select]     │                        │                        │
│  Status     [select]     │                        │                        │
│  Decision   [select]     │                        │                        │
│  (Edit only, per role)   │                        │                        │
│                          │                        │                        │
└──────────────────────────┴────────────────────────┴────────────────────────┘
```

- **Column visibility differs between the two modals:** in `Edit Task` all three columns are always rendered (Column 2 carries the `DropZone` and Column 3 carries the `[+] Add Note` button, so neither is ever empty). In `View Task` a column is rendered **only if it has content** — an empty Files column (no documents) or an empty Notes column (no review comments) is omitted.
- **Column 1 — Task Info:** Title, Description, then Assignees and Reviewers rendered **as multi-selects for the creator only** — non-creators see read-only name chips — plus Status (see [10.3](#103-status-select)). The **Decision** select is rendered only for users who are reviewers on the task and only while the task is `Submitted` (see [10.4](#104-reviewer-decision-select)); otherwise it is omitted.
- **Column 2 — Files:** `FileList` (existing documents + entries for new uploads) and a `DropZone`. In `View Task` the upload controls are hidden and existing files are read-only (View file only, no delete). In `Edit Task` the column is always rendered; in `View Task` it is omitted when there are no documents.
- **Column 3 — Notes:** the task's review comments, listed newest first, truncated. In `Edit Task` a **`+` button** opens the same `AddNoteModal` used by the Notes tab (scoped to the task via `task_id`), which refreshes the list on success; the column is always rendered. In `View Task` the list is shown read-only (opening a note uses the Notes tab's shared `ViewNoteModal`) and the column is omitted when there are no review comments.
- **Add Task uses 2 columns** (Task Info + Files). There is no notes column because a note requires a parent task, which does not exist until the task is created.

### 10.3 Status Select

- Render in the Status select only the valid next-states for the caller's role: an assignee in `Pending` may pick `Submitted`; once `Submitted`, the assignee's Status field is locked to its current value (see [§5](#5-file-locking)). A reviewer never drives status via this select — they use the [Decision Select](#104-reviewer-decision-select).
- Only the assignee is expected to move a task through its lifecycle: they pick `Submitted` to submit their work, and Save. A reviewer records `Accepted` / `Rejected` separately via the [Decision Select](#104-reviewer-decision-select) — the status re-derives automatically.
- Saving with a changed status calls the same update action as any other field. The server validates the transition against the caller's role and the current state **and rejects invalid transitions with a toast** (see [AGENTS.md](../AGENTS.md)). The select is role-filtered to valid transitions for UX; the server remains authoritative.
- The lock while `Submitted` is enforced in the actions layer.

### 10.4 Reviewer Decision Select

- A reviewer drives the workflow the same way an assignee does — a single select and Save. For a reviewer that select is their **own Decision** (`Accepted` / `Rejected`), rendered in `Edit Task` only when they are a reviewer on the task and the task is `Submitted`. `Pending` remains the pre-decision default state and is not a selectable value.
- Saving records the reviewer's decision (`TaskReviewer.decision` + `reviewed_at`) and re-derives the task status: all accepted → `Completed`, any rejected → `Pending` with all decisions reset.
- The decision may be accompanied by an optional review comment entered in the Notes column. The reviewer writes the comment via **[+] Add Note**.

## 11. Audit Trail

All review actions are task `UPDATE` mutations, audited automatically via `createAuditLog` (immutable, read-only access — see [Audit Logging](./security.md#audit-logging)). Review comments are captured in the audit `details`.
