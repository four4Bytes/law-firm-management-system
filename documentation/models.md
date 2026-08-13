# Data Models

This document describes the main entities in the system and their fields.

This is not the spec to follow but a mirror of schema.primsa

> For the authoritative source and exact database schema, see [schema.prisma](../prisma/schema.prisma).

---

## Core Entities

### User

A person who can sign in and use the system.

| Field   | Type      | Required | Description                        |
| ------- | --------- | -------- | ---------------------------------- |
| Name    | Text      | Yes      | Display name                       |
| Email   | Text      | Yes      | Email address (unique)             |
| Role    | Enum      | Yes      | Access level (see [Roles](#roles)) |
| Status  | Boolean   | Yes      | Whether the user can sign in       |
| Avatar  | Text      | No       | Profile image URL                  |
| Created | Timestamp | Yes      | When the account was created       |
| Updated | Timestamp | Yes      | When the account was last modified |

---

### Client

An external client (individual or organization) who may have consultations or cases.

| Field   | Type      | Required | Description                       |
| ------- | --------- | -------- | --------------------------------- |
| Name    | Text      | Yes      | Client name                       |
| Email   | Text      | No       | Email address                     |
| Phone   | Text      | No       | Phone number                      |
| Address | Text      | No       | Physical address                  |
| Created | Timestamp | Yes      | When the record was created       |
| Updated | Timestamp | Yes      | When the record was last modified |

---

### Consultation

An initial meeting with a client to discuss their legal concern.

| Field         | Type      | Required | Description                                                      |
| ------------- | --------- | -------- | ---------------------------------------------------------------- |
| Client        | Link      | Yes      | The client who requested the consultation                        |
| Created By    | Link      | Yes      | The user who created the record                                  |
| Booking Date  | Timestamp | Yes      | When the consultation is scheduled                               |
| Concern       | Text      | Yes      | Description of the client's concern                              |
| Status        | Enum      | Yes      | Current status (see [Consultation Status](#consultation-status)) |
| Reminder Days | Number    | No       | Days before booking to send a reminder                           |
| Created       | Timestamp | Yes      | When the record was created                                      |
| Updated       | Timestamp | Yes      | When the record was last modified                                |

---

### Case

A legal case opened for a client.

| Field               | Type      | Required | Description                                      |
| ------------------- | --------- | -------- | ------------------------------------------------ |
| Client              | Link      | Yes      | The client this case belongs to                  |
| Title               | Text      | Yes      | Case title                                       |
| Type                | Text      | Yes      | Type of case (e.g., "Civil", "Criminal")         |
| Parties Involved    | Text      | No       | Other parties in the case                        |
| Status              | Enum      | Yes      | Current status (see [Case Status](#case-status)) |
| Source Consultation | Link      | No       | The consultation this case originated from       |
| Created By          | Link      | Yes      | The user who created the record                  |
| Created             | Timestamp | Yes      | When the record was created                      |
| Updated             | Timestamp | Yes      | When the record was last modified                |

---

### Task

A work item within a case.

| Field       | Type      | Required | Description                                                     |
| ----------- | --------- | -------- | --------------------------------------------------------------- |
| Case        | Link      | Yes      | The parent case                                                 |
| Title       | Text      | Yes      | Task title                                                      |
| Description | Text      | No       | Task details                                                    |
| Status      | Enum      | Yes      | Current status (see [Task Status](#task-status))                |
| Created By  | Link      | Yes      | The user who created the task (auto-reviewer)                   |
| Assignees   | Links     | No       | Users assigned to this task                                     |
| Reviewers   | Links     | No       | Users reviewing this task (see [Task Reviewer](#task-reviewer)) |
| Created     | Timestamp | Yes      | When the record was created                                     |
| Updated     | Timestamp | Yes      | When the record was last modified                               |

---

### Milestone

A key deadline or checkpoint within a case.

| Field         | Type      | Required | Description                                                |
| ------------- | --------- | -------- | ---------------------------------------------------------- |
| Case          | Link      | Yes      | The parent case                                            |
| Title         | Text      | Yes      | Milestone title                                            |
| Description   | Text      | No       | Milestone details                                          |
| Due Date      | Date      | Yes      | When the milestone is due                                  |
| Status        | Enum      | Yes      | Current status (see [Milestone Status](#milestone-status)) |
| Reminder Days | Number    | No       | Days before due date to send a reminder                    |
| Created By    | Link      | Yes      | The user who created the milestone                         |
| Created       | Timestamp | Yes      | When the record was created                                |
| Updated       | Timestamp | Yes      | When the record was last modified                          |

---

### Payment

A financial transaction linked to a case or consultation.

| Field          | Type      | Required | Description                                            |
| -------------- | --------- | -------- | ------------------------------------------------------ |
| Amount         | Decimal   | Yes      | Payment amount                                         |
| Payment Date   | Date      | Yes      | When the payment was made                              |
| Status         | Enum      | Yes      | Current status (see [Payment Status](#payment-status)) |
| Payment Method | Text      | No       | How the payment was made                               |
| Receipt Number | Text      | No       | Receipt or reference number                            |
| Case           | Link      | No       | The case this payment belongs to                       |
| Consultation   | Link      | No       | The consultation this payment belongs to               |
| Created By     | Link      | Yes      | The user who recorded the payment                      |
| Created        | Timestamp | Yes      | When the record was created                            |
| Updated        | Timestamp | Yes      | When the record was last modified                      |

> Payment must be linked to either a Case or a Consultation (one is required).

---

### Note

An internal note attached to a case, consultation, or task.

| Field        | Type      | Required | Description                           |
| ------------ | --------- | -------- | ------------------------------------- |
| Content      | Text      | Yes      | The note text                         |
| Case         | Link      | No       | The case this note belongs to         |
| Consultation | Link      | No       | The consultation this note belongs to |
| Task         | Link      | No       | The task this note belongs to         |
| Created By   | Link      | Yes      | The user who wrote the note           |
| Created      | Timestamp | Yes      | When the note was created             |
| Updated      | Timestamp | Yes      | When the note was last modified       |

> Note must be linked to a Case, Consultation, or Task (one is required).

---

### Document

A file attachment linked to a case, consultation, or task.

| Field        | Type      | Required | Description                               |
| ------------ | --------- | -------- | ----------------------------------------- |
| File Name    | Text      | Yes      | Original file name                        |
| File Path    | Text      | Yes      | Storage location (internal)               |
| File Type    | Text      | Yes      | MIME type (e.g., "application/pdf")       |
| File Size    | Number    | No       | Size in bytes                             |
| Case         | Link      | No       | The case this document belongs to         |
| Consultation | Link      | No       | The consultation this document belongs to |
| Task         | Link      | No       | The task this document belongs to         |
| Uploaded By  | Link      | Yes      | The user who uploaded the file            |
| Created      | Timestamp | Yes      | When the file was uploaded                |
| Updated      | Timestamp | Yes      | When the record was last modified         |

> Document must be linked to a Case, Consultation, or Task (one is required).

---

### Notification

A system notification sent to a user.

| Field        | Type      | Required | Description                       |
| ------------ | --------- | -------- | --------------------------------- |
| User         | Link      | Yes      | The recipient                     |
| Type         | Enum      | Yes      | Notification category             |
| Title        | Text      | Yes      | Notification headline             |
| Message      | Text      | Yes      | Notification body                 |
| Read         | Boolean   | Yes      | Whether the user has read it      |
| Action URL   | Text      | No       | Link to the relevant record       |
| Case         | Link      | No       | Related case                      |
| Consultation | Link      | No       | Related consultation              |
| Milestone    | Link      | No       | Related milestone                 |
| Task         | Link      | No       | Related task                      |
| Created      | Timestamp | Yes      | When the notification was created |

---

### Audit Log

A system-generated record of an action taken in the system. Audit logs are immutable — they cannot be edited or deleted.

| Field       | Type      | Required | Description                            |
| ----------- | --------- | -------- | -------------------------------------- |
| Actor       | Link      | Yes      | The user who performed the action      |
| Action      | Text      | Yes      | What was done (e.g., "case.created")   |
| Entity Type | Text      | Yes      | Type of record affected (e.g., "Case") |
| Entity ID   | UUID      | Yes      | ID of the record affected              |
| Details     | Text      | No       | Human-readable summary                 |
| Created     | Timestamp | Yes      | When the action occurred               |

---

## Assignment Records

These records track which users are assigned to which cases, consultations, or tasks.

### Case Assignment

Links a user to a case.

| Field   | Type      | Required | Description        |
| ------- | --------- | -------- | ------------------ |
| Case    | Link      | Yes      | The case           |
| User    | Link      | Yes      | The assigned user  |
| Created | Timestamp | Yes      | When assigned      |
| Updated | Timestamp | Yes      | When last modified |

---

### Consultation Assignment

Links a user to a consultation.

| Field        | Type      | Required | Description        |
| ------------ | --------- | -------- | ------------------ |
| Consultation | Link      | Yes      | The consultation   |
| User         | Link      | Yes      | The assigned user  |
| Created      | Timestamp | Yes      | When assigned      |
| Updated      | Timestamp | Yes      | When last modified |

---

### Task Assignment

Links a user to a task.

| Field   | Type      | Required | Description        |
| ------- | --------- | -------- | ------------------ |
| Task    | Link      | Yes      | The task           |
| User    | Link      | Yes      | The assigned user  |
| Created | Timestamp | Yes      | When assigned      |
| Updated | Timestamp | Yes      | When last modified |

---

### Task Reviewer

Links a reviewer to a task for approval workflows.

| Field       | Type      | Required | Description                                                |
| ----------- | --------- | -------- | ---------------------------------------------------------- |
| Task        | Link      | Yes      | The task being reviewed                                    |
| Reviewer    | Link      | Yes      | The user assigned to review                                |
| Decision    | Enum      | Yes      | Current decision (see [Review Decision](#review-decision)) |
| Reviewed At | Timestamp | No       | When the reviewer made their decision                      |
| Created     | Timestamp | Yes      | When assigned                                              |
| Updated     | Timestamp | Yes      | When last modified                                         |

> A reviewer has exactly one decision per task. Re-adding the same reviewer resets their decision to `Pending` and clears `Reviewed At`.

---

## Enums

### Roles

| Value         | Description                                     |
| ------------- | ----------------------------------------------- |
| Dev           | Developer account for bootstrapping (temporary) |
| Admin         | Full system access                              |
| BranchManager | Manages a branch, full access within scope      |
| Lawyer        | Handles cases and consultations                 |
| Paralegal     | Supports lawyers with assigned tasks            |
| ProcessServer | Handles document delivery for assigned tasks    |

---

### Consultation Status

| Value     | Description                            |
| --------- | -------------------------------------- |
| Scheduled | Consultation is booked                 |
| Completed | Consultation has taken place           |
| Accepted  | Client accepted, case may be opened    |
| Rejected  | Client declined or matter not suitable |
| Cancelled | Consultation was cancelled             |

---

### Case Status

| Value      | Description                      |
| ---------- | -------------------------------- |
| Open       | Case created but not yet active  |
| Ongoing    | Case is actively being worked on |
| Closed     | Case concluded successfully      |
| Terminated | Case ended without completion    |
| Settled    | Case settled out of court        |

---

### Task Status

| Value     | Description                        |
| --------- | ---------------------------------- |
| Pending   | Created, in progress, or reworking |
| Submitted | Work submitted, under review       |
| Completed | All reviewers accepted the task    |
| Cancelled | Task is no longer relevant         |

---

### Review Decision

| Value    | Description                                 |
| -------- | ------------------------------------------- |
| Pending  | Awaiting the reviewer's decision            |
| Accepted | Reviewer approves the work                  |
| Rejected | Reviewer rejects the work, assignee reworks |

---

### Milestone Status

| Value     | Description                    |
| --------- | ------------------------------ |
| Pending   | Milestone not yet reached      |
| Done      | Milestone completed            |
| Cancelled | Milestone no longer applicable |

---

### Notification Type

| Value                     | Description                                        |
| ------------------------- | -------------------------------------------------- |
| ConsultationReminder      | Upcoming consultation — due within reminder window |
| ConsultationOverdue       | Consultation booking date has passed               |
| MilestoneDueSoon          | Milestone due within reminder window               |
| MilestoneStatusChanged    | Any milestone status change                        |
| MilestoneOverdue          | Milestone due date has passed                      |
| TaskAssigned              | User assigned to a task                            |
| TaskStatusChanged         | Any task status change (review workflow)           |
| CaseAssigned              | User assigned to a case (assignee added)           |
| CaseStatusChanged         | Any case status change                             |
| ConsultationAssigned      | Consultation assignee added                        |
| ConsultationStatusChanged | Any consultation status change                     |

> See [Notifications & Reminders](./notifications.md) for the full delivery rules.

---

### Payment Status

| Value    | Description                |
| -------- | -------------------------- |
| Unpaid   | No payment received        |
| Partial  | Partial payment received   |
| Paid     | Fully paid                 |
| Refunded | Payment returned to client |
