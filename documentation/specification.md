# Specification

> **Status:** RBAC is not yet implemented — the tables below are the planned model, not the current state. The final scope and behavior still need confirmation.

A web-based case management system for **Anino Law & Real Estate Firm**. Manages end-to-end case workflows — from client consultation and intake to task delegation, document management, milestone tracking, and payment recording.

## Role Hierarchy

```
DEV - Initial user to bootstrap the app

ADMIN
  → BRANCH MANAGER
    → LAWYER
      → PARALEGAL
        → PROCESS SERVER

```

**Legend:**

- `C` = Create
- `R` = Read (Unrestricted global access)
- `R*` = Conditional Read (Access granted only if the user is explicitly assigned to a task or review node within that case)
- `U` = Update
- `D` = Delete
- `-` = No Access

## Global Permissions

| Role           | User | Cases | Consultations | Activity Logs |
| -------------- | ---- | ----- | ------------- | ------------- |
| Dev            | CRUD | -     | -             | -             |
| Admin          | CRUD | CRUD  | CRUD          | R             |
| Branch Manager | CRU  | CRUD  | CRUD          | R             |
| Lawyer         | R    | R     | R             | R             |
| Paralegal      | -    | R*    | -             | -             |
| Process Server | -    | R*    | -             | -             |

## Case Context Permissions

| Role           | Client | Payment | Note | Milestone | Attachments                | Task             | Activity Log |
| -------------- | ------ | ------- | ---- | --------- | -------------------------- | ---------------- | ------------ |
| Admin          | RU     | CRUD    | CRUD | CRUD      | CRUD                       | CRUD             | R            |
| Branch Manager | RU     | CRUD    | CRUD | CRUD      | CRUD                       | CRUD             | R            |
| Lawyer         | R      | -       | CRUD | CRUD      | CRUD                       | CRUD             | R            |
| Paralegal      | -      | -       | CRUD | R         | CRUD (assigned tasks only) | CR, U (assigned) | R            |
| Process Server | -      | -       | CRUD | R         | CRUD (assigned tasks only) | R, U (assigned)  | R            |

**Notes:**

- Activity Logs are immutable — created automatically by the system. No role can create, update, or delete log entries. All roles are limited to read-only access.
- Client profiles can be created standalone or during case/consultation creation.
- Documents attached to a consultation are stored separately — they do not appear in the case Attachments tab (planned).
- The Global Attachment tab displays all files across the entire case, including sub-task files, with status, timestamp, and link to the originating task (planned).
- Payment data is restricted to Admin and BranchManager (planned — currently uses `requireAuth()` only).

## Entity Lifecycle

Statuses are defined in `prisma/schema.prisma` as enums. The code validates against these values but does not enforce a state machine — any valid status can be set at any time.

### Consultation

`Scheduled`, `Completed`, `Accepted`, `Rejected`, `Cancelled`

Consultations track `reminder_days` and `last_reminded_at` for automated notifications.

### Case

`Open`, `Ongoing`, `Closed`, `Terminated`, `Settled`

Cases can optionally link to a source consultation via `source_consultation_id`. Cases have assigned users via `CaseAssignment` (unique per user-case pair).

### Task

`Pending`, `Ongoing`, `Submitted`, `Accepted`, `Rejected`, `Cancelled`

**Rules:**

- Only Admin, BranchManager, Lawyer, or Paralegal can create tasks (planned — not enforced).
- Tasks must have at least one assignee at creation (planned — `assignee_ids` is currently optional in the schema).
- Assigning a Paralegal or Process Server to a task opens conditional read-only access to the parent case (planned — not implemented).

**Review Chain (planned):**

1. Task is set to `Pending` or `Ongoing`. Assignees update details and upload files.
2. Assignees mark the task as done → state changes to `Submitted`. Task files lock from further assignee edits while review is pending.
3. The task creator can:
   - **Final action:** Change status directly to `Accepted` or `Rejected`.
   - **Further review:** Delegate the decision by assigning a new reviewer.
4. The new reviewer gets full read context of the parent case and write access only to update this task's status. They can accept, reject, or delegate further.

### Milestone

`Pending`, `Done`, `Cancelled`

Milestones track `due_date` and `reminder_days`. Overdue milestones trigger notifications.

### Payment

`Unpaid`, `Partial`, `Paid`, `Refunded`

Payments can be linked to a Case or a Consultation.

## Allowed File Types (planned)

No file type or size enforcement is currently implemented in the code. The table below documents the target allowed types.

| Category  | Extensions                                       |
| --------- | ------------------------------------------------ |
| Images    | `PNG`, `JPEG`, `JPG`, `SVG`, `GIF`               |
| Data      | `XLSX`, `XLS`, `CSV`                             |
| Media     | `MP4`, `MP3`, `MKV`                              |
| Documents | `DOC`, `DOCX`, `PPT`, `PPTX`, `TXT`, `MD`, `PDF` |

## Prisma Models

The database schema defines these core models:

| Model           | Purpose                             | Key Relations                                              |
| --------------- | ----------------------------------- | ---------------------------------------------------------- |
| `User`          | System users with role-based access | Cases, Tasks, Notifications, Documents                     |
| `Client`        | External clients (auto-created)     | Consultations, Cases                                       |
| `Consultation`  | Initial client meetings             | Client, User (creator), Cases, Payments, Documents         |
| `Case`          | Legal case records                  | Client, Consultation (source), Tasks, Milestones, Payments |
| `Task`          | Work items within a case            | Case, Assignees, Reviewers, Documents                      |
| `TaskReviewer`  | Review chain for task approval      | Task, User (reviewer), User (delegator)                    |
| `CaseMilestone` | Key dates/deadlines for a case      | Case, Notifications                                        |
| `Payment`       | Financial transactions              | Case or Consultation                                       |
| `Document`      | File attachments (stored in S3)     | Case, Consultation, or Task                                |
| `Note`          | Internal notes                      | Case, Consultation, or Task                                |
| `Notification`  | System notifications                | User, Case, Consultation, Milestone, Task                  |
| `AuditLog`      | Audit trail                         | User                                                       |

See `prisma/schema.prisma` for the full schema definition.
