# Legal Case Management System (LCMS) — Specification

NOTE: THIS DOCUMENT IS THE SINGLE SOURCE OF TRUTH

Firm: Anino Law & Real Estate Firm

System: Legal Case Management System (LCMS)

Purpose: Web-based system for Anino Law & Real Estate Firm that manages end-to-end case workflows — from client consultation and intake to task delegation, document management, milestone tracking, and payment recording.

---

## Tech Stack

Frontend

- React + TypeScript
- CSS Modules (for component-scoped styling)
- React Aria (for accessible UI primitives)

Backend

- Next.js (App Router) + TypeScript
- Prisma ORM
- PostgreSQL

Auth

- NextAuth.js
- Google OAuth 2.0 SSO (Restricted to firm emails only. No password login allowed).

File Storage

The exact storage backend is open, so the codebase must use a standardized S3-compatible API (`PutObject`, `GetObject`) to keep deployment flexible.

- On-Premise: Docker container running MinIO or Garage OSS with local volume mounts.
- VPS / Cloud: Any standard S3 bucket mapped via environment variables.
- Rule: Avoid provider-specific PaaS blob SDKs. Stick to standard S3 commands.

---

## Roles & Permissions

Hierarchy

```
ADMIN
  → BRANCH MANAGER
    → LAWYER
      → PARALEGAL
        → PROCESS SERVER

```

Concepts

- `C` = Create
- `R` = Read (Unrestricted global access)
- `R*` = Conditional Read (Access granted only if the user is explicitly assigned to a task or review node within that case)
- `U` = Update
- `D` = Delete
- `-` = No Access

### Global Scope

| Role           | User Mgmt | Cases | Consultations | Activity Logs |
| -------------- | --------- | ----- | ------------- | ------------- |
| Admin          | CRUD      | CRUD  | CRUD          | R             |
| Branch Manager | CRU       | CRUD  | CRUD          | R             |
| Lawyer         | R         | R     | R             | R             |
| Paralegal      | -         | R\*   | -             | -             |
| Process Server | -         | R\*   | -             | -             |

---

### Case Context Scope

Rules & Constraints

- Clients: Client profiles are generated automatically during case creation. They cannot be initialized as standalone records. Once created, they are restricted to `UPDATE` actions only.
- Payments: Financial tracking is strictly locked to `Admin` and `BranchManager`. Other roles cannot view or touch payment data.
- Global Attachment Tab: Displays all files uploaded across the entire case, including files from sub-tasks. Task-specific files must show their current status, upload timestamp, and a direct link to the originating task.
- Documents attached to a consultation are stored separately and visible in the consultation view — they do not appear in the case Attachments tab.

Allowed File Types

- Images: `PNG`, `JPEG`, `JPG`, `SVG`, `GIF`
- Data: `XLSX`, `XLS`, `CSV`
- Media: `MP4`, `MP3`, `MKV`
- Documents: `DOC`, `DOCX`, `PPT`, `PPTX`, `TXT`, `MD`, `PDF`

| Role           | Client | Payment | Note | Milestone | Attachments | Task            | Activity Log |
| -------------- | ------ | ------- | ---- | --------- | ----------- | --------------- | ------------ |
| Admin          | RU     | CRUD    | CRUD | CRUD      | CRUD        | CRUD            | R            |
| Branch Manager | RU     | CRUD    | CRUD | CRUD      | CRUD        | CRUD            | R            |
| Lawyer         | R      | -       | CRUD | CRUD      | R           | CRUD            | R            |
| Paralegal      | -      | -       | CRUD | R         | R           | CR, U(assigned) | R            |
| Process Server | -      | -       | CRUD | R         | R           | R, U(assigned)  | R            |

Activity Logs in this table refer to case-scoped/filtered logs visible when viewing a case. System-wide activity logs (Global Scope table) are restricted differently.

---

#### Task Workflow

- Only `Admin`, `BranchManager`, `Lawyer`, or `Paralegal` can create tasks.
- Tasks must have at least one assignee at creation. Floating or unassigned tasks are blocked.
- Assigning a `Paralegal` or `Process Server` to a task automatically opens up conditional read-only (`R*`) access to the parent case.

Life Cycle & Review Chain:

1. Task is set to `Pending` or `Ongoing`. Assignees update details and upload files.
2. Assignees mark the task as done. State changes to `Submitted`. This locks the task files from further assignee edits while review is pending.
3. The task creator can take two paths:

- Final Action: Change status directly to `Accepted` or `Rejected`.
- Further Review: Delegate the decision by assigning a new Reviewer.

4. The new Reviewer gets full read context of the parent case and write access _only_ to update this specific task's status. They can accept it, reject it, or pass it down the line to another reviewer.

| Role           | Task Attachments                                 |
| -------------- | ------------------------------------------------ |
| Admin          | CRUD (Unrestricted)                              |
| Branch Manager | CRUD (Unrestricted)                              |
| Lawyer         | CRUD (Unrestricted)                              |
| Paralegal      | CRUD (Only on tasks explicitly assigned to them) |
| Process Server | CRUD (Only on tasks explicitly assigned to them) |

---

### Consultation Context Scope

Only `Admin`, `Branch Manager`, and `Lawyer` can accept a consultation and turn it into a case.

| Role           | Status Modification (Accept & Elevate to Case) |
| -------------- | ---------------------------------------------- |
| Admin          | CRUD                                           |
| Branch Manager | CRUD                                           |
| Lawyer         | CRUD                                           |
| Paralegal      | -                                              |
| Process Server | -                                              |
