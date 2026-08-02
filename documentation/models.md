# Data Models

This document describes the main entities in the system and their fields.

---

## Core Entities

### User

A person who can sign in and use the system.

| Field   | Type      | Description                        |
| ------- | --------- | ---------------------------------- |
| Name    | Text      | Display name                       |
| Email   | Text      | Email address (unique)             |
| Role    | Enum      | Access level (see [Roles](#roles)) |
| Status  | Boolean   | Whether the user can sign in       |
| Avatar  | Text      | Profile image URL                  |
| Created | Timestamp | When the account was created       |
| Updated | Timestamp | When the account was last modified |

---

### Client

An external client (individual or organization) who may have consultations or cases.

| Field   | Type      | Description                       |
| ------- | --------- | --------------------------------- |
| Name    | Text      | Client name                       |
| Email   | Text      | Email address (optional)          |
| Phone   | Text      | Phone number (optional)           |
| Address | Text      | Physical address (optional)       |
| Created | Timestamp | When the record was created       |
| Updated | Timestamp | When the record was last modified |

---

### Consultation

An initial meeting with a client to discuss their legal concern.

| Field         | Type      | Description                                                      |
| ------------- | --------- | ---------------------------------------------------------------- |
| Client        | Link      | The client who requested the consultation                        |
| Created By    | Link      | The user who created the record                                  |
| Booking Date  | Timestamp | When the consultation is scheduled                               |
| Concern       | Text      | Description of the client's concern                              |
| Status        | Enum      | Current status (see [Consultation Status](#consultation-status)) |
| Reminder Days | Number    | Days before booking to send a reminder (optional)                |
| Created       | Timestamp | When the record was created                                      |
| Updated       | Timestamp | When the record was last modified                                |

---

### Case

A legal case opened for a client.

| Field               | Type      | Description                                           |
| ------------------- | --------- | ----------------------------------------------------- |
| Client              | Link      | The client this case belongs to                       |
| Title               | Text      | Case title                                            |
| Type                | Text      | Type of case (e.g., "Civil", "Criminal")              |
| Parties Involved    | Text      | Other parties in the case (optional)                  |
| Status              | Enum      | Current status (see [Case Status](#case-status))      |
| Source Consultation | Link      | The consultation this case originated from (optional) |
| Created By          | Link      | The user who created the record                       |
| Created             | Timestamp | When the record was created                           |
| Updated             | Timestamp | When the record was last modified                     |

---

### Task

A work item within a case.

| Field       | Type      | Description                                      |
| ----------- | --------- | ------------------------------------------------ |
| Case        | Link      | The parent case                                  |
| Title       | Text      | Task title                                       |
| Description | Text      | Task details (optional)                          |
| Status      | Enum      | Current status (see [Task Status](#task-status)) |
| Created By  | Link      | The user who created the task                    |
| Assignees   | Links     | Users assigned to this task                      |
| Created     | Timestamp | When the record was created                      |
| Updated     | Timestamp | When the record was last modified                |

---

### Milestone

A key deadline or checkpoint within a case.

| Field         | Type      | Description                                                |
| ------------- | --------- | ---------------------------------------------------------- |
| Case          | Link      | The parent case                                            |
| Title         | Text      | Milestone title                                            |
| Description   | Text      | Milestone details (optional)                               |
| Due Date      | Date      | When the milestone is due                                  |
| Status        | Enum      | Current status (see [Milestone Status](#milestone-status)) |
| Reminder Days | Number    | Days before due date to send a reminder (optional)         |
| Created By    | Link      | The user who created the milestone                         |
| Created       | Timestamp | When the record was created                                |
| Updated       | Timestamp | When the record was last modified                          |

---

### Payment

A financial transaction linked to a case or consultation.

| Field          | Type      | Description                                            |
| -------------- | --------- | ------------------------------------------------------ |
| Amount         | Decimal   | Payment amount                                         |
| Payment Date   | Date      | When the payment was made                              |
| Status         | Enum      | Current status (see [Payment Status](#payment-status)) |
| Payment Method | Text      | How the payment was made (optional)                    |
| Receipt Number | Text      | Receipt or reference number (optional)                 |
| Case           | Link      | The case this payment belongs to (optional)            |
| Consultation   | Link      | The consultation this payment belongs to (optional)    |
| Created By     | Link      | The user who recorded the payment                      |
| Created        | Timestamp | When the record was created                            |
| Updated        | Timestamp | When the record was last modified                      |

---

### Note

An internal note attached to a case, consultation, or task.

| Field        | Type      | Description                                      |
| ------------ | --------- | ------------------------------------------------ |
| Content      | Text      | The note text                                    |
| Case         | Link      | The case this note belongs to (optional)         |
| Consultation | Link      | The consultation this note belongs to (optional) |
| Task         | Link      | The task this note belongs to (optional)         |
| Created By   | Link      | The user who wrote the note                      |
| Created      | Timestamp | When the note was created                        |
| Updated      | Timestamp | When the note was last modified                  |

---

### Document

A file attachment linked to a case, consultation, or task.

| Field        | Type      | Description                                          |
| ------------ | --------- | ---------------------------------------------------- |
| File Name    | Text      | Original file name                                   |
| File Path    | Text      | Storage location (internal)                          |
| File Type    | Text      | MIME type (e.g., "application/pdf")                  |
| File Size    | Number    | Size in bytes (optional)                             |
| Case         | Link      | The case this document belongs to (optional)         |
| Consultation | Link      | The consultation this document belongs to (optional) |
| Task         | Link      | The task this document belongs to (optional)         |
| Uploaded By  | Link      | The user who uploaded the file                       |
| Created      | Timestamp | When the file was uploaded                           |
| Updated      | Timestamp | When the record was last modified                    |

---

### Notification

A system notification sent to a user.

| Field        | Type      | Description                            |
| ------------ | --------- | -------------------------------------- |
| User         | Link      | The recipient                          |
| Type         | Enum      | Notification category                  |
| Title        | Text      | Notification headline                  |
| Message      | Text      | Notification body                      |
| Read         | Boolean   | Whether the user has read it           |
| Action URL   | Text      | Link to the relevant record (optional) |
| Case         | Link      | Related case (optional)                |
| Consultation | Link      | Related consultation (optional)        |
| Milestone    | Link      | Related milestone (optional)           |
| Task         | Link      | Related task (optional)                |
| Created      | Timestamp | When the notification was created      |

---

### Audit Log

A system-generated record of an action taken in the system. Audit logs are immutable — they cannot be edited or deleted.

| Field       | Type      | Description                            |
| ----------- | --------- | -------------------------------------- |
| Actor       | Link      | The user who performed the action      |
| Action      | Text      | What was done (e.g., "case.created")   |
| Entity Type | Text      | Type of record affected (e.g., "Case") |
| Entity ID   | UUID      | ID of the record affected              |
| Details     | Text      | Human-readable summary (optional)      |
| Created     | Timestamp | When the action occurred               |

---

## Assignment Records

These records track which users are assigned to which cases, consultations, or tasks.

### Case Assignment

Links a user to a case.

| Field   | Type      | Description        |
| ------- | --------- | ------------------ |
| Case    | Link      | The case           |
| User    | Link      | The assigned user  |
| Created | Timestamp | When assigned      |
| Updated | Timestamp | When last modified |

---

### Consultation Assignment

Links a user to a consultation.

| Field        | Type      | Description        |
| ------------ | --------- | ------------------ |
| Consultation | Link      | The consultation   |
| User         | Link      | The assigned user  |
| Created      | Timestamp | When assigned      |
| Updated      | Timestamp | When last modified |

---

### Task Assignment

Links a user to a task.

| Field   | Type      | Description        |
| ------- | --------- | ------------------ |
| Task    | Link      | The task           |
| User    | Link      | The assigned user  |
| Created | Timestamp | When assigned      |
| Updated | Timestamp | When last modified |

---

### Task Reviewer

Links a reviewer to a task for approval workflows.

| Field        | Type      | Description                               |
| ------------ | --------- | ----------------------------------------- |
| Task         | Link      | The task being reviewed                   |
| Reviewer     | Link      | The user assigned to review               |
| Delegated By | Link      | The user who assigned the reviewer        |
| Active       | Boolean   | Whether this reviewer is currently active |
| Created      | Timestamp | When assigned                             |
| Updated      | Timestamp | When last modified                        |

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

| Value     | Description                     |
| --------- | ------------------------------- |
| Pending   | Task created, waiting to start  |
| Ongoing   | Task is in progress             |
| Submitted | Task completed, awaiting review |
| Accepted  | Task approved by reviewer       |
| Rejected  | Task rejected, needs revision   |
| Cancelled | Task cancelled                  |

---

### Milestone Status

| Value     | Description                    |
| --------- | ------------------------------ |
| Pending   | Milestone not yet reached      |
| Done      | Milestone completed            |
| Cancelled | Milestone no longer applicable |

---

### Payment Status

| Value    | Description                |
| -------- | -------------------------- |
| Unpaid   | No payment received        |
| Partial  | Partial payment received   |
| Paid     | Fully paid                 |
| Refunded | Payment returned to client |
